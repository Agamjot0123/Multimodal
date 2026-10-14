import os
import jwt
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
    Authenticates the caller from `Authorization: Bearer <JWT>`.

    The JWT is issued by the auth server after Google sign-in and verified
    here locally with the shared JWT_SECRET (no network call). A Bearer token
    equal to the admin test id is also accepted for Swagger UI testing.
    """
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    token = header[7:].strip()

    if token == ADMIN_TEST_ID:
        return AuthenticatedUser(id=ADMIN_TEST_ID)

    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="Server auth is not configured.")
    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    return AuthenticatedUser(id=str(claims["id"]), email=claims.get("email"))
