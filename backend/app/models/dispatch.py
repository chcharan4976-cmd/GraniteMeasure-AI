import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ApprovalEvent(Base):
    __tablename__ = "approval_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    block_id: Mapped[str] = mapped_column(String, ForeignKey("granite_blocks.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(
        String, nullable=False
    )  # SUBMITTED, OFFICER_REVIEW, ADMIN_REVIEW, APPROVED, REJECTED, RETURNED
    from_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    to_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    performed_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
