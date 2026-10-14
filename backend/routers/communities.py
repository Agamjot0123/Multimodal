from fastapi import APIRouter, Depends, HTTPException
from typing import List
from postgrest.exceptions import APIError
from schemas import (
    CreateCommunityRequest, CommunityResponse, JoinCommunityRequest,
    CommunityResource, CreateResourceRequest
)
from auth import get_current_user, AuthenticatedUser
from utils import generate_invite_code
from db import get_db

router = APIRouter(prefix="/api/communities", tags=["Communities"])

UNIQUE_VIOLATION = "23505"
INVALID_UUID = "22P02"


def _get_community(id: str) -> dict:
    try:
        rows = get_db().table("communities").select("*").eq("id", id).execute().data
    except APIError as e:
        if e.code == INVALID_UUID:
            rows = []
        else:
            raise
    if not rows:
        raise HTTPException(status_code=404, detail="Community not found.")
    return rows[0]


def _is_member(community_id: str, user_id: str) -> bool:
    try:
        rows = (
            get_db().table("community_members").select("user_id")
            .eq("community_id", community_id).eq("user_id", user_id)
            .execute().data
        )
    except APIError as e:
        if e.code == INVALID_UUID:
            return False
        raise
    return bool(rows)


@router.post("/create", response_model=CommunityResponse)
def create_community(
    req: CreateCommunityRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Creates a new community and generates a unique invite code."""
    db = get_db()
    for _ in range(5):  # retry on the (unlikely) invite code collision
        try:
            community = db.table("communities").insert({
                "name": req.name,
                "description": req.description,
                "owner_id": current_user.id,
                "invite_code": generate_invite_code(),
            }).execute().data[0]
            break
        except APIError as e:
            if e.code != UNIQUE_VIOLATION:
                raise
    else:
        raise HTTPException(status_code=500, detail="Could not generate a unique invite code.")

    db.table("community_members").insert({
        "community_id": community["id"],
        "user_id": current_user.id,
    }).execute()

    return CommunityResponse(**community)


@router.post("/join", response_model=CommunityResponse)
def join_community(
    req: JoinCommunityRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Joins a community using an invite code."""
    db = get_db()
    rows = db.table("communities").select("*").eq("invite_code", req.invite_code).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Invalid invite code.")

    community = rows[0]
    db.table("community_members").upsert(
        {"community_id": community["id"], "user_id": current_user.id},
        on_conflict="community_id,user_id",
    ).execute()

    return CommunityResponse(**community)


@router.get("/{id}/invite-code")
def get_invite_code(
    id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Fetches the invite code for a community (members only)."""
    community = _get_community(id)
    if not _is_member(id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied. You are not a member.")

    return {"invite_code": community["invite_code"]}


@router.post("/{id}/regenerate-key")
def regenerate_invite_code(
    id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Regenerates the invite code (owner only)."""
    community = _get_community(id)
    if community["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only the community owner can regenerate invite keys.")

    for _ in range(5):
        new_code = generate_invite_code()
        try:
            get_db().table("communities").update({"invite_code": new_code}).eq("id", id).execute()
            return {"id": id, "new_invite_code": new_code}
        except APIError as e:
            if e.code != UNIQUE_VIOLATION:
                raise
    raise HTTPException(status_code=500, detail="Could not generate a unique invite code.")


@router.delete("/leave")
def leave_community(
    community_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Removes current user from a community."""
    if not _is_member(community_id, current_user.id):
        raise HTTPException(status_code=400, detail="You are not a member of this community.")

    get_db().table("community_members").delete() \
        .eq("community_id", community_id).eq("user_id", current_user.id).execute()
    return {"status": "success", "message": f"Left community {community_id}"}


@router.get("/{id}/resources", response_model=List[CommunityResource])
def list_community_resources(
    id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Lists all shared course resources in a community."""
    if not _is_member(id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")
    return (
        get_db().table("resources")
        .select("id,file_name,file_type,community_id")
        .eq("community_id", id).order("created_at").execute().data
    )


@router.post("/{id}/resources", response_model=CommunityResource)
def add_community_resource(
    id: str,
    req: CreateResourceRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Registers document metadata for a file shared in a community (members only)."""
    if not _is_member(id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")
    row = get_db().table("resources").insert({
        "community_id": id,
        "file_name": req.file_name,
        "file_type": req.file_type,
        "storage_path": req.storage_path,
        "uploaded_by": current_user.id,
    }).execute().data[0]
    return CommunityResource(**row)
