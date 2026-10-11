# app/models/audit.py
"""Audit log model accessor."""


def __getattr__(name: str):
    if name == "AuditLog":
        from app.models import AuditLog

        return AuditLog
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
