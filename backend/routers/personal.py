import mimetypes
from uuid import uuid4
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from postgrest.exceptions import APIError
from typing import List
from schemas import CommunityResource
from auth import get_current_user, AuthenticatedUser
from db import get_db
from routers.communities import read_upload
from ingestion_bridge import delete_indexed_document, index_upload

router = APIRouter(prefix="/api/personal", tags=["Personal"])

BUCKET = "private-materials"
INVALID_UUID = "22P02"


def _to_resource(row: dict) -> CommunityResource:
    # Personal files have no community; reuse the resource shape with an empty community_id.
    return CommunityResource(id=row["id"], file_name=row["file_name"], file_type=row["file_type"], community_id="")


@router.get("/resources", response_model=List[CommunityResource])
def list_personal_resources(current_user: AuthenticatedUser = Depends(get_current_user)):
    rows = (
        get_db().table("documents").select("id,file_name,file_type")
        .eq("owner_id", current_user.id).eq("access_scope", "private")
        .neq("processing_status", "deleted")
        .order("created_at").execute().data
    )
    return [_to_resource(r) for r in rows]


@router.post("/resources/upload", response_model=CommunityResource)
async def upload_personal_resource(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Uploads a private PDF or video, visible only to its owner."""
    name, file_type, data = await read_upload(file)
    doc_id = str(uuid4())
    path = f"{current_user.id}/{doc_id}/{name}"
    db = get_db()
    db.storage.from_(BUCKET).upload(
        path=path,
        file=data,
        file_options={"content-type": mimetypes.guess_type(name)[0] or "application/octet-stream"},
    )
    row = db.table("documents").insert({
        "id": doc_id,
        "owner_id": current_user.id,
        "file_name": name,
        "file_type": file_type,
        "access_scope": "private",
        "community_id": None,
        "storage_path": f"{BUCKET}/{path}",
        "processing_status": "uploaded",
    }).execute().data[0]

    def set_status(status: str, error: str | None):
        db.table("documents").update({"processing_status": status, "error_message": error}).eq("id", doc_id).execute()

    # Index in the background so chat can answer from this file once it finishes.
    background_tasks.add_task(
        index_upload, data, name, file_type,
        user_id=current_user.id, document_id=doc_id, status=set_status,
    )
    return _to_resource(row)


@router.get("/resources/{resource_id}/url")
def get_personal_resource_url(resource_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    """Short-lived signed URL for one of the caller's own files."""
    try:
        rows = (
            get_db().table("documents").select("storage_path")
            .eq("id", resource_id).eq("owner_id", current_user.id).eq("access_scope", "private")
            .execute().data
        )
    except APIError as e:
        if e.code != INVALID_UUID:
            raise
        rows = []
    if not rows:
        raise HTTPException(status_code=404, detail="File not found.")
    bucket, _, path = rows[0]["storage_path"].partition("/")
    return {"url": get_db().storage.from_(bucket).create_signed_url(path, 3600)["signedURL"]}

@router.delete("/resources/{resource_id}")
def delete_personal_resource(
    resource_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    db = get_db()

    try:
        rows = (
            db.table("documents")
            .select("id,storage_path")
            .eq("id", resource_id)
            .eq("owner_id", current_user.id)
            .eq("access_scope", "private")
            .neq("processing_status", "deleted")
            .execute()
            .data
        )
    except APIError as e:
        if e.code != INVALID_UUID:
            raise
        rows = []

    if not rows:
        raise HTTPException(status_code=404, detail="File not found.")

    document = rows[0]

    bucket, _, storage_path = document["storage_path"].partition("/")

    db.table("documents").update({
        "processing_status": "deleting",
        "error_message": None,
    }).eq("id", document["id"]).execute()

    delete_indexed_document(
        document["id"],
        user_id=current_user.id,
    )

    if bucket and storage_path:
        db.storage.from_(bucket).remove([storage_path])

    db.table("documents").update({
        "processing_status": "deleted",
    }).eq("id", document["id"]).execute()

    return {
        "status": "success",
        "document_id": document["id"],
    }