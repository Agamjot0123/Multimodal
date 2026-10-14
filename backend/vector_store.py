from typing import List
from postgrest.exceptions import APIError
from schemas import ContextChunk
from auth import AuthenticatedUser
from db import get_db
from ingestion_bridge import search_chunks


def member_community_ids(user_id: str) -> List[str]:
    """Communities the user belongs to, read from the database (the JWT does not carry them)."""
    try:
        rows = get_db().table("community_members").select("community_id").eq("user_id", user_id).execute().data
    except APIError:
        return []
    return [r["community_id"] for r in rows]


def search_permission_scoped_chunks(
    query: str,
    user: AuthenticatedUser,
    top_k: int = 5
) -> List[ContextChunk]:
    """
    Hybrid (vector + keyword) search over the ingestion index, limited to the user's
    own private files and the communities they have actually joined.
    """
    return search_chunks(query, user.id, member_community_ids(user.id), top_k)
