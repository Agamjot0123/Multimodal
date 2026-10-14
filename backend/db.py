import os
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
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment."
        )
    return create_client(url, key)
