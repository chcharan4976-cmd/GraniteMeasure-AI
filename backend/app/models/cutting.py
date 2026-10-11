import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CuttingPlan(Base):
    __tablename__ = "cutting_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    block_id: Mapped[str] = mapped_column(String, ForeignKey("granite_blocks.id"), nullable=False)
    plan_name: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(
        String, default="DRAFT"
    )  # DRAFT, PROPOSED, APPROVED, EXECUTED
    target_length_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    target_breadth_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    target_height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    original_volume_m3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dressed_volume_m3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    removed_volume_m3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recovery_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wastage_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recovery_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wastage_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    saw_kerf_loss_m3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dressing_trim_loss_m3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cavity_loss_m3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dressing_objective: Mapped[Optional[str]] = mapped_column(String, default="MAXIMIZE_RECTANGULAR_YIELD", nullable=True)
    optimization_method: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    plan_data_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON for detailed cut operations
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    operations: Mapped[List["CuttingOperation"]] = relationship(
        "CuttingOperation",
        back_populates="plan",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="CuttingOperation.operation_order",
    )


class CuttingOperation(Base):
    __tablename__ = "cutting_operations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cutting_plans.id", ondelete="CASCADE"), nullable=False
    )
    operation_order: Mapped[int] = mapped_column(Integer, default=1)
    cut_type: Mapped[str] = mapped_column(
        String, nullable=False
    )  # PLANAR_CUT, SURFACE_DRESS, CORNER_REMOVAL, DEFECT_AVOIDANCE
    description: Mapped[str] = mapped_column(Text, nullable=False)
    plane_normal_json: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # JSON for nx,ny,nz
    plane_offset: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    material_removed_m3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    expected_dimensions_json: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    recovery_impact_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    uncertainty_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    plan: Mapped["CuttingPlan"] = relationship("CuttingPlan", back_populates="operations")
