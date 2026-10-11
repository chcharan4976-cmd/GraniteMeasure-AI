import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class DefectResult(Base):
    __tablename__ = "defect_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    block_id: Mapped[str] = mapped_column(String, ForeignKey("granite_blocks.id"), nullable=False)
    job_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("analysis_jobs.id"), nullable=True)
    defect_type: Mapped[str] = mapped_column(
        String, nullable=False
    )  # FRACTURE, CRACK, CHIP, CAVITY, PROTRUSION, DISCOLORATION, STRUCTURAL_UNCERTAINTY
    severity: Mapped[str] = mapped_column(
        String, nullable=False
    )  # LOW, MEDIUM, HIGH, CRITICAL
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location_description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    image_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("block_images.id"), nullable=True)
    bounding_box_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON for x,y,w,h in image
    opening_width_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    opening_length_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    opening_area_cm2: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    estimated_depth_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    missing_volume_cm3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dressing_eliminated: Mapped[bool] = mapped_column(Boolean, default=False)
    dressing_recommendation: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    affects_cutting: Mapped[bool] = mapped_column(Boolean, default=False)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    confirmed_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
