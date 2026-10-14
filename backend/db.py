import os
from fastapi import HTTPException
from functools import lru_cache
from supabase import create_client, Client


@lru_cache(maxsize=1)
def get_db() -> Client:
    """
    Returns a cached Supabase client for Postgres access.

    Uses the service-role key, which bypasses Row Level Security. It must only
    ever live on the backend; authorization is enforced in the routers.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        # HTTPException (not RuntimeError) so the client gets a readable JSON error with CORS headers.
        raise HTTPException(
            status_code=503,
            detail="Database is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the backend.",
        )
    return create_client(url, key)
