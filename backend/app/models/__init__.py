"""SQLAlchemy ORM models for GraniteMeasure AI."""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, nullable=False)  # Officer, Quarry Operator, Supervisor, Admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Quarry(Base):
    __tablename__ = "quarries"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    code = Column(String, unique=True)
    lease_reference = Column(String)
    district = Column(String)
    mandal = Column(String)
    village = Column(String)
    granite_category = Column(String)
    gps_latitude = Column(Float)
    gps_longitude = Column(Float)
    operator_id = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class GraniteBlock(Base):
    __tablename__ = "granite_blocks"
    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String, unique=True, index=True, nullable=False)
    quarry_id = Column(Integer, ForeignKey("quarries.id"))
    color_group = Column(String, nullable=False)
    block_type = Column(String, default="RAW")  # RAW or PROCESSED
    status = Column(String, default="REGISTERED")  # REGISTERED, CAPTURED, ANALYZING, MEASURED, VERIFIED, FAILED
    gps_latitude = Column(Float)
    gps_longitude = Column(Float)
    observations = Column(Text)
    registered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class CaptureSession(Base):
    __tablename__ = "capture_sessions"
    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("granite_blocks.id"), nullable=False)
    officer_name = Column(String)
    status = Column(String, default="IN_PROGRESS")  # IN_PROGRESS, COMPLETED, CANCELLED
    image_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime)
    images = relationship("BlockImage", back_populates="session")


class BlockImage(Base):
    __tablename__ = "block_images"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("capture_sessions.id"), nullable=False)
    block_id = Column(Integer, ForeignKey("granite_blocks.id"), nullable=False)
    file_path = Column(String, nullable=False)
    original_filename = Column(String)
    sha256 = Column(String, nullable=False)
    file_size = Column(Integer)
    image_width = Column(Integer)
    image_height = Column(Integer)
    sequence_number = Column(Integer)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    session = relationship("CaptureSession", back_populates="images")


class ImageQualityResult(Base):
    __tablename__ = "image_quality_results"
    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("block_images.id"), nullable=False)
    is_pass = Column(Boolean, nullable=False)
    blur_score = Column(Float)
    brightness = Column(Float)
    contrast = Column(Float)
    resolution_ok = Column(Boolean)
    warnings = Column(Text)  # JSON string
    analyzed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class CalibrationResult(Base):
    __tablename__ = "calibration_results"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("capture_sessions.id"), nullable=False)
    marker_detected = Column(Boolean, default=False)
    marker_count = Column(Integer, default=0)
    scale_px_per_cm = Column(Float)
    marker_size_cm = Column(Float)
    reprojection_error = Column(Float)
    status = Column(String, default="NOT_CALIBRATED")  # CALIBRATED, NOT_CALIBRATED, PARTIAL
    details = Column(Text)  # JSON
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"
    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("granite_blocks.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("capture_sessions.id"))
    status = Column(String, default="PENDING")  # PENDING, VALIDATING, FEATURE_MATCHING, RECONSTRUCTING, MEASURING, COMPLETED, FAILED
    current_step = Column(String, default="QUEUED")
    progress_pct = Column(Integer, default=0)
    error_message = Column(Text)
    result_summary = Column(Text)  # JSON
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime)


class MeasurementResult(Base):
    __tablename__ = "measurement_results"
    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("granite_blocks.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("analysis_jobs.id"))
    length_cm = Column(Float)
    breadth_cm = Column(Float)
    height_cm = Column(Float)
    volume_m3 = Column(Float)
    weight_mt = Column(Float)
    confidence = Column(Float)
    status = Column(String, default="ESTIMATED")  # MEASURED, ESTIMATED, PARTIAL, UNVERIFIED, FAILED
    calibration_status = Column(String, default="NOT_CALIBRATED")
    measurement_type = Column(String, default="STEREO_RECONSTRUCTION")
    reconstructed_points = Column(Integer)
    usable_images = Column(Integer)
    warnings = Column(Text)  # JSON
    details = Column(Text)  # JSON with full measurement details
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SeigniorageRateVersion(Base):
    __tablename__ = "seigniorage_rate_versions"
    id = Column(Integer, primary_key=True, index=True)
    version_name = Column(String, nullable=False)
    description = Column(Text)
    active_from = Column(DateTime)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SeigniorageRate(Base):
    __tablename__ = "seigniorage_rates"
    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("seigniorage_rate_versions.id"))
    color_group = Column(String, nullable=False)
    above_gangsaw_rate = Column(Float, nullable=False)
    below_gangsaw_rate = Column(Float, nullable=False)
    unit = Column(String, default="₹/MT")


class SeigniorageAssessment(Base):
    __tablename__ = "seigniorage_assessments"
    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("granite_blocks.id"), nullable=False)
    measurement_id = Column(Integer, ForeignKey("measurement_results.id"))
    rate_version = Column(String)
    color_group = Column(String)
    classification = Column(String)  # Above Gangsaw / Below Gangsaw
    is_above_gangsaw = Column(Boolean)
    rate_per_mt = Column(Float)
    weight_mt = Column(Float)
    weight_source = Column(String)
    indicative_amount = Column(Float)
    disclaimer = Column(Text)
    assessed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ManualVerification(Base):
    __tablename__ = "manual_verifications"
    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("granite_blocks.id"))
    assessment_id = Column(Integer, ForeignKey("seigniorage_assessments.id"))
    verified_by = Column(Integer, ForeignKey("users.id"))
    verification_status = Column(String)  # APPROVED, REJECTED, PENDING
    remarks = Column(Text)
    verified_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class WeighbridgeRecord(Base):
    __tablename__ = "weighbridge_records"
    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("granite_blocks.id"))
    record_id = Column(String)
    net_mass_mt = Column(Float)
    weighing_date = Column(DateTime)
    vehicle_number = Column(String)
    operator = Column(String)
    source_record = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DispatchRecord(Base):
    __tablename__ = "dispatch_records"
    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("granite_blocks.id"))
    dispatch_date = Column(DateTime)
    vehicle_number = Column(String)
    transit_pass_ref = Column(String)
    weighbridge_ref = Column(String)
    destination = Column(String)
    status = Column(String, default="PENDING")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String)
    entity_id = Column(Integer)
    details = Column(Text)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
