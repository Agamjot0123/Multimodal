
import json
from pathlib import Path

from ingestion.scripts.document_parser import extract_document
from ingestion.scripts.text_chunker import chunk_document, chunk_transcript
from ingestion.scripts.retrieval import add_chunks


def _attach_metadata(
    chunks: list[dict],
    *,
    file_name: str,
    file_path: str,
    user_id: str,
    community_id: str | None,
) -> list[dict]:
    """Attach source and access metadata to every chunk."""

    for chunk in chunks:
        chunk["file_name"] = chunk.get("file_name", file_name)
        chunk["file_path"] = file_path
        chunk["user_id"] = user_id
        chunk["community_id"] = community_id

    return chunks


def index_file(
    file_path: str | Path,
    *,
    user_id: str,
    document_id: str,
    community_id: str | None = None,
    source_path: str | None = None,
) -> int:
    """Extract, chunk, and index a PDF or image."""

    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")
    if not user_id.strip():
        raise ValueError("user_id must not be empty")
    if not document_id.strip():
        raise ValueError("document_id must not be empty")

    document = extract_document(str(path))
    chunks = chunk_document(document)

    chunks = _attach_metadata(
        chunks,
        file_name=path.name,
        file_path=source_path or str(path.resolve()),
        user_id=user_id,
        community_id=community_id,
    )

    count = add_chunks(
        chunks,
        owner_id=user_id,
        document_id=document_id,
        access_scope="community" if community_id else "private",
        community_id=community_id,
    )

    print(f"File: {path.name}")
    print(f"Chunks created: {len(chunks)}")
    print(f"Chunks indexed: {count}")
    print(f"User: {user_id}")
    print(f"Community: {community_id or 'Private'}")

    return count


def index_transcript_json(
    file_path: str | Path,
    *,
    user_id: str,
    document_id: str,
    community_id: str | None = None,
    source_path: str | None = None,
) -> int:
    """Chunk and index a timestamped faster-whisper transcript."""

    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")
    if not user_id.strip():
        raise ValueError("user_id must not be empty")
    if not document_id.strip():
        raise ValueError("document_id must not be empty")

    with path.open("r", encoding="utf-8") as file:
        transcript = json.load(file)

    file_name = transcript.get("file_name", path.stem)

    segments = [
        {
            "start": segment["start_time"],
            "end": segment["end_time"],
            "text": segment["text"],
        }
        for segment in transcript.get("segments", [])
    ]

    chunks = chunk_transcript(
        segments=segments,
        file_name=file_name,
    )

    chunks = _attach_metadata(
        chunks,
        file_name=file_name,
        file_path=source_path or str(path.resolve()),
        user_id=user_id,
        community_id=community_id,
    )

    count = add_chunks(
        chunks,
        owner_id=user_id,
        document_id=document_id,
        access_scope="community" if community_id else "private",
        community_id=community_id,
    )

    print(f"Transcript: {file_name}")
    print(f"Chunks created: {len(chunks)}")
    print(f"Chunks indexed: {count}")
    print(f"User: {user_id}")
    print(f"Community: {community_id or 'Private'}")

    return count
