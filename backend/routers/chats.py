from fastapi import APIRouter, Depends, HTTPException
from typing import List
from schemas import ChatSession
from auth import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/api/chats", tags=["Chat Management"])

mock_chats_db = {}

@router.get("", response_model=List[ChatSession])
def list_chats(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Lists all active chat sessions for the authenticated user."""
    return mock_chats_db.get(current_user.id, [])

@router.delete("/{chat_id}")
def delete_chat(chat_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    """Deletes a specific chat session."""
    user_chats = mock_chats_db.get(current_user.id, [])
    updated_chats = [c for c in user_chats if c.id != chat_id]
    
    if len(user_chats) == len(updated_chats):
        raise HTTPException(status_code=404, detail="Chat session not found.")
        
    mock_chats_db[current_user.id] = updated_chats
    return {"status": "success", "message": f"Chat {chat_id} deleted."}