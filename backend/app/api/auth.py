from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import hashlib

from app.database import get_db
from app.models import User, AuditLog
from app.schemas import LoginRequest, Token

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

# Local dev users (PoC only - not for production)
DEV_USERS = {
    "admin": {"password": "admin123", "role": "Admin", "full_name": "System Administrator", "id": 1},
    "officer": {"password": "officer123", "role": "Officer", "full_name": "Mining Officer", "id": 2},
    "operator": {"password": "operator123", "role": "Quarry Operator", "full_name": "Quarry Operator", "id": 3},
    "supervisor": {"password": "supervisor123", "role": "Supervisor", "full_name": "Supervisor", "id": 4},
}


@router.post("/login", response_model=Token)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Local development authentication.
    This is a clearly identified local dev auth method for PoC purposes.
    Production deployment would require government SSO integration.
    """
    user = DEV_USERS.get(request.username)
    if not user or user["password"] != request.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Ensure user exists in DB
    result = await db.execute(select(User).where(User.username == request.username))
    db_user = result.scalar_one_or_none()
    if not db_user:
        db_user = User(
            id=user["id"],
            username=request.username,
            hashed_password=hashlib.sha256(user["password"].encode()).hexdigest(),
            full_name=user["full_name"],
            role=user["role"],
            is_active=True,
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)

    # Audit
    audit = AuditLog(
        user_id=db_user.id,
        action="LOGIN",
        entity_type="User",
        entity_id=db_user.id,
        details=f"User {request.username} logged in (dev auth)",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)
    await db.commit()

    # Simple token for PoC
    token = hashlib.sha256(f"{request.username}:{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()

    return Token(
        access_token=token,
        token_type="bearer",
        user_id=db_user.id,
        username=db_user.username,
        role=db_user.role,
        full_name=db_user.full_name,
    )


@router.get("/me")
async def get_current_user():
    """Get current user info (PoC - returns default admin)."""
    return {
        "id": 1,
        "username": "admin",
        "role": "Admin",
        "full_name": "System Administrator",
        "is_dev_auth": True,
    }
