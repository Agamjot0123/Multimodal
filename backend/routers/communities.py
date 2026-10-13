from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from schemas import (
    CreateCommunityRequest, CommunityResponse, JoinCommunityRequest,
    CommunityResource, ChatSession
)
from auth import get_current_user, AuthenticatedUser
from utils import generate_invite_code

router = APIRouter(prefix="/api/communities", tags=["Communities"])

# In-memory mock databases (Replace with your database client like Supabase PostgREST)
mock_communities_db = {}
mock_memberships_db = {}  # community_id -> set of user_ids
mock_resources_db = {}    # community_id -> list of resources
mock_chats_db = {}        # user_id -> list of chat sessions

@router.post("/create", response_model=CommunityResponse)
def create_community(
    req: CreateCommunityRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Creates a new community and generates a unique invite code."""
    community_id = f"comm_{len(mock_communities_db) + 1}"
    invite_code = generate_invite_code()

    community_data = {
        "id": community_id,
        "name": req.name,
        "description": req.description,
        "owner_id": current_user.id,
        "invite_code": invite_code,
    }

    mock_communities_db[community_id] = community_data
    mock_memberships_db[community_id] = {current_user.id}
    mock_resources_db[community_id] = []

    return CommunityResponse(**community_data)


@router.post("/join", response_model=CommunityResponse)
def join_community(
    req: JoinCommunityRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Joins a community using an 8-character invite code."""
    target_community = None
    for comm in mock_communities_db.values():
        if comm["invite_code"] == req.invite_code:
            target_community = comm
            break

    if not target_community:
        raise HTTPException(status_code=404, detail="Invalid invite code.")

    comm_id = target_community["id"]
    mock_memberships_db[comm_id].add(current_user.id)

    return CommunityResponse(**target_community)


@router.get("/{id}/invite-code")
def get_invite_code(
    id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Fetches the invite code for a community (members only)."""
    if id not in mock_communities_db:
        raise HTTPException(status_code=404, detail="Community not found.")
    if current_user.id not in mock_memberships_db.get(id, set()):
        raise HTTPException(status_code=403, detail="Access denied. You are not a member.")

    return {"invite_code": mock_communities_db[id]["invite_code"]}


@router.post("/{id}/regenerate-key")
def regenerate_invite_code(
    id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Regenerates the invite code (owner only)."""
    if id not in mock_communities_db:
        raise HTTPException(status_code=404, detail="Community not found.")
    
    community = mock_communities_db[id]
    if community["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only the community owner can regenerate invite keys.")

    new_code = generate_invite_code()
    community["invite_code"] = new_code
    return {"id": id, "new_invite_code": new_code}


@router.delete("/leave")
def leave_community(
    community_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Removes current user from a community."""
    if community_id in mock_memberships_db and current_user.id in mock_memberships_db[community_id]:
        mock_memberships_db[community_id].remove(current_user.id)
        return {"status": "success", "message": f"Left community {community_id}"}
    raise HTTPException(status_code=400, detail="You are not a member of this community.")


@router.get("/{id}/resources", response_model=List[CommunityResource])
def list_community_resources(
    id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Lists all shared course resources in a community."""
    if current_user.id not in mock_memberships_db.get(id, set()):
        raise HTTPException(status_code=403, detail="Access denied.")
    return mock_resources_db.get(id, [])