"""Glue between the FastAPI backend and the `ingestion/` package.

Uploads are indexed in the background (extract -> chunk -> embed -> ChromaDB), and chat
retrieves from that same index with the ingestion package's hybrid (vector + BM25) search.
Ingestion modules are imported lazily: they pull in heavy ML dependencies, and the API
should still start (and report a readable error) if those are not installed.
"""
import logging
import sys
import tempfile
from pathlib import Path
from typing import Callable, List, Optional

from schemas import ContextChunk, SourceMetadata

# `ingestion` imports itself as `ingestion.scripts...`, so the repo root must be importable.
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

log = logging.getLogger("ingestion_bridge")

StatusCallback = Callable[[str, Optional[str]], None]  # (status, error_message)
CancellationCheck = Callable[[], bool]


def format_time(seconds) -> Optional[str]:
    """Video chunks store seconds as numbers; the API/citations use "MM:SS"."""
    if seconds is None:
        return None
    seconds = int(float(seconds))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def _upload_is_cancelled(document_id: str, community_id: Optional[str]) -> bool:
    """Treat a missing or deleting metadata row as a cancellation signal."""
    from db import get_db

    table = "resources" if community_id else "documents"
    rows = (
        get_db()
        .table(table)
        .select("processing_status")
        .eq("id", document_id)
        .execute()
        .data
    )
    if not rows:
        return True
    return rows[0].get("processing_status") in {"deleting", "deleted"}


def search_chunks(query: str, user_id: str, community_ids: List[str], top_k: int = 5) -> List[ContextChunk]:
    """Hybrid search over the user's private files and the communities they belong to."""
    try:
        from ingestion.scripts.retrieval import get_relevant_chunks

        results = get_relevant_chunks(query, user_id=user_id, community_ids=community_ids, top_k=top_k)
    except Exception:
        log.exception("Retrieval failed")
        return []

    chunks = []
    for r in results:
        m = r["metadata"]
        chunks.append(
            ContextChunk(
                chunk_id=f'{m.get("document_id")}_{m.get("chunk_index")}_{m.get("page_number")}_{m.get("start_time")}',
                text=r["text"],
                metadata=SourceMetadata(
                    file_name=m.get("file_name", "Unknown"),
                    page_number=m.get("page_number"),
                    start_time=format_time(m.get("start_time")),
                    end_time=format_time(m.get("end_time")),
                ),
            )
        )
    return chunks


def index_upload(
    data: bytes,
    name: str,
    file_type: str,
    *,
    user_id: str,
    document_id: str,
    community_id: Optional[str] = None,
    status: Optional[StatusCallback] = None,
    should_cancel: Optional[CancellationCheck] = None,
) -> None:
    """Runs the ingestion pipeline on an uploaded file. Meant for a background task.

    The file is written to a temp dir under its original name so chunk metadata
    (`file_name`) matches the name shown in the UI and used in citations.
    """
    report = status or (lambda *_: None)
    should_cancel = should_cancel or (
        lambda: _upload_is_cancelled(document_id, community_id)
    )
    if should_cancel():
        return
    report("processing", None)
    try:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / name
            path.write_bytes(data)
            kwargs = dict(user_id=user_id, document_id=document_id, community_id=community_id)

            if file_type == "video":
                from ingestion.scripts.index_documents import index_transcript_json
                from ingestion.scripts.transcribe_video import transcribe_video

                transcript = Path(tmp) / "transcript.json"
                transcribe_video(str(path), str(transcript))
                count = index_transcript_json(
                    transcript,
                    should_cancel=should_cancel,
                    **kwargs,
                )
            else:  # pdf / image
                from ingestion.scripts.index_documents import index_file

                count = index_file(path, should_cancel=should_cancel, **kwargs)

        if should_cancel():
            return
        if count == 0:
            report("failed", "No readable text was found in this file.")
        else:
            report("completed", None)
    except Exception as e:
        from ingestion.scripts.index_documents import IndexCancelled

        if isinstance(e, IndexCancelled):
            return
        log.exception("Ingestion failed for %s", name)
        report("failed", str(e)[:500])

def delete_indexed_document(
    document_id: str,
    *,
    user_id: str,
    community_id: str | None = None,
) -> int:
    """Delete one document's chunks from the ingestion index."""

    try:
        from ingestion.scripts.index_documents import delete_indexed_document as delete_from_index

        return delete_from_index(
            document_id,
            user_id=user_id,
            community_id=community_id,
        )
    except Exception:
        log.exception("Failed to delete indexed document %s", document_id)
        raise


def reindex_missing() -> None:
    """Rebuilds the search index for files that are stored but no longer indexed.

    The ChromaDB index lives on the server's local disk, which is wiped on every restart or
    redeploy on hosts without a persistent disk, while the files and their rows live in Supabase.
    Run once at startup (in a background thread): any file that is not deleted but has no chunks
    in the index is downloaded again and re-indexed.
    """
    try:
        from db import get_db
        from ingestion.scripts.retrieval import collection

        db = get_db()
        # (table, owner column, community id column or None)
        jobs = []
        for row in db.table("documents").select("id,owner_id,file_name,file_type,storage_path,processing_status") \
                .in_("processing_status", ["completed", "processing", "uploaded"]).execute().data:
            jobs.append(("documents", row, row["owner_id"], None))
        for row in db.table("resources").select("id,uploaded_by,community_id,file_name,file_type,storage_path,processing_status") \
                .in_("processing_status", ["completed", "processing", "uploaded"]).execute().data:
            if row.get("uploaded_by") and row.get("storage_path"):
                jobs.append(("resources", row, row["uploaded_by"], row["community_id"]))

        for table, row, owner, community_id in jobs:
            try:
                if collection.get(where={"document_id": row["id"]}, limit=1, include=[])["ids"]:
                    continue  # already indexed
                bucket, _, path = row["storage_path"].partition("/")
                data = db.storage.from_(bucket).download(path)

                def set_status(status, error, _table=table, _id=row["id"]):
                    db.table(_table).update({"processing_status": status, "error_message": error}).eq("id", _id).execute()

                log.info("Re-indexing %s (%s)", row["file_name"], row["id"])
                index_upload(
                    data, row["file_name"], row["file_type"],
                    user_id=owner, document_id=row["id"], community_id=community_id, status=set_status,
                )
            except Exception:
                log.exception("Re-index failed for %s", row.get("id"))
    except Exception:
        log.exception("Startup re-index failed")
