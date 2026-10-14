
import os
import mimetypes
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the project-root .env"
    )

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def upload_document(
    file_path: str,
    *,
    owner_id: str,
    access_scope: str = "private",
    community_id: str | None = None,
    document_id: str | None = None,
) -> dict:
    """
    Upload a document to private Supabase Storage and save its metadata.

    owner_id must come from a verified authenticated user.
    For community uploads, community_id must identify a community
    whose membership has already been verified by the backend.
    """
    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")

    if access_scope not in ("private", "community"):
        raise ValueError("access_scope must be 'private' or 'community'")

    if access_scope == "community" and not community_id:
        raise ValueError("community_id is required for community uploads")

    if access_scope == "private" and community_id is not None:
        raise ValueError("Private uploads must not have a community_id")

    bucket = (
        "private-materials"
        if access_scope == "private"
        else "community-materials"
    )

    document_id = document_id or str(uuid4())
    storage_path = f"{owner_id}/{document_id}/{path.name}"
    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"

    with path.open("rb") as file:
        supabase.storage.from_(bucket).upload(
            path=storage_path,
            file=file,
            file_options={
                "content-type": mime_type,
                "upsert": "false",
            },
        )

    record = {
        "id": document_id,
        "owner_id": owner_id,
        "file_name": path.name,
        "file_type": mime_type,
        "access_scope": access_scope,
        "community_id": community_id,
        "storage_path": f"{bucket}/{storage_path}",
        "processing_status": "uploaded",
    }

    try:
        result = supabase.table("documents").insert(record).execute()
        return result.data[0]
    except Exception:
        # Avoid leaving an orphaned file if metadata insertion fails.
        try:
            supabase.storage.from_(bucket).remove([storage_path])
        except Exception:
            pass
        raise
