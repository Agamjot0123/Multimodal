import os
import httpx
from fastapi import HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional

# Fixed Admin/Testing ID for development and Swagger UI (sent as a Bearer token)
ADMIN_TEST_ID = "admin-test-uuid-993967d0-bb82"


class AuthenticatedUser(BaseModel):
    id: str
    email: Optional[str] = "testuser@example.com"
    communities: List[str] = []


def get_current_user(request: Request) -> AuthenticatedUser:
    """
    Authenticates the caller against the Express/Google auth server.

    The browser's session cookie is forwarded to `{AUTH_SERVER_URL}/auth/me`, which
    returns the Google profile for a valid session. A Bearer token equal to the
    admin test id is also accepted for Swagger UI testing.
    """
    bearer = request.headers.get("authorization", "")
    if bearer.lower().startswith("bearer ") and bearer[7:].strip() == ADMIN_TEST_ID:
        return AuthenticatedUser(id=ADMIN_TEST_ID)

    cookie = request.headers.get("cookie")
    if not cookie:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    auth_url = os.getenv("AUTH_SERVER_URL", "http://localhost:4000").rstrip("/")
    try:
        res = httpx.get(f"{auth_url}/auth/me", headers={"cookie": cookie}, timeout=5)
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Auth server unreachable.")
    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    profile = res.json()
    return AuthenticatedUser(id=str(profile["id"]), email=profile.get("email"))
