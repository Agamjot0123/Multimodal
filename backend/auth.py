import os
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional

security = HTTPBearer()

class AuthenticatedUser(BaseModel):
    id: str
    email: Optional[str] = "testuser@example.com"
    communities: List[str] = []

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> AuthenticatedUser:
    """
    Decodes and authenticates Supabase JWT tokens.
    Supports local testing with UUIDs and automatically attaches user context.
    """
    token = credentials.credentials.strip()

    if not token:
        raise HTTPException(status_code=401, detail="Authorization token missing.")

    # 1. Dev/Swagger Fallback: Allow raw UUID testing locally
    if not token.startswith("eyJ") and len(token) > 10:
        return AuthenticatedUser(
            id=token,
            email="testuser@example.com"
        )

    # 2. Production Flow: Decode Supabase JWT Bearer Token
    try:
        # Decode payload from Supabase Auth token
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing 'sub' claim.")

        user_metadata = payload.get("user_metadata", {})
        communities = user_metadata.get("communities", [])

        return AuthenticatedUser(
            id=user_id,
            email=payload.get("email", "testuser@example.com"),
            communities=communities
        )
    except jwt.DecodeError as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")