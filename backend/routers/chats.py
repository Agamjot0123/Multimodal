from fastapi import APIRouter, Depends, HTTPException
from typing import List
from postgrest.exceptions import APIError
from schemas import ChatSession
from auth import get_current_user, AuthenticatedUser
from db import get_db

router = APIRouter(prefix="/api/chats", tags=["Chat Management"])

@router.get("", response_model=List[ChatSession])
def list_chats(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Lists all active chat sessions for the authenticated user."""
    return (
        get_db().table("chats")
        .select("id,title,created_at,community_id")
        .eq("user_id", current_user.id).order("created_at", desc=True).execute().data
    )

@router.delete("/{chat_id}")
def delete_chat(chat_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    """Deletes a specific chat session."""
    try:
        deleted = (
            get_db().table("chats").delete()
            .eq("id", chat_id).eq("user_id", current_user.id).execute().data
        )
    except APIError as e:
        if e.code != "22P02":  # malformed uuid -> treat as not found
            raise
        deleted = []

    if not deleted:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return {"status": "success", "message": f"Chat {chat_id} deleted."}
