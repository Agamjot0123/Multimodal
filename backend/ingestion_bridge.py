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


def format_time(seconds) -> Optional[str]:
    """Video chunks store seconds as numbers; the API/citations use "MM:SS"."""
    if seconds is None:
        return None
    seconds = int(float(seconds))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


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
) -> None:
    """Runs the ingestion pipeline on an uploaded file. Meant for a background task.

    The file is written to a temp dir under its original name so chunk metadata
    (`file_name`) matches the name shown in the UI and used in citations.
    """
    report = status or (lambda *_: None)
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
                count = index_transcript_json(transcript, **kwargs)
            else:  # pdf / image
                from ingestion.scripts.index_documents import index_file

                count = index_file(path, **kwargs)

        if count == 0:
            report("failed", "No readable text was found in this file.")
        else:
            report("completed", None)
    except Exception as e:
        log.exception("Ingestion failed for %s", name)
        report("failed", str(e)[:500])
