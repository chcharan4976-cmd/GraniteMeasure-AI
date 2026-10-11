from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import GraniteBlock, MeasurementResult
from app.services.ai_assistant_service import answer_query, KNOWLEDGE_BASE

router = APIRouter(prefix="/assistant", tags=["AI Assistant"])


class QuestionRequest(BaseModel):
    query: str = Field(..., description="Query regarding rules, gangsaw thresholds, defects, calibration, or seigniorage")
    block_id: Optional[str] = Field(None, description="Optional block ID to ground the answer in measured data")


@router.post("/ask")
async def ask_assistant(
    payload: QuestionRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Deterministic, citation-grounded Q&A assistant for mining officers and operators."""
    block_ctx = None
    if payload.block_id:
        int_id = int(payload.block_id) if payload.block_id.isdigit() else 0
        blk = (await db.execute(select(GraniteBlock).where(GraniteBlock.id == int_id))).scalar_one_or_none()
        meas = (
            await db.execute(
                select(MeasurementResult)
                .where(MeasurementResult.block_id == int_id)
                .order_by(MeasurementResult.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if blk:
            block_ctx = {
                "identifier": blk.identifier,
                "color_group": blk.color_group,
                "status": blk.status,
                "length_cm": meas.length_cm if meas else None,
                "breadth_cm": meas.breadth_cm if meas else None,
                "height_cm": meas.height_cm if meas else None,
            }

    return answer_query(payload.query, block_context=block_ctx)


@router.get("/topics")
async def list_assistant_topics():
    """List available domain topics indexed in the deterministic knowledge base."""
    return [
        {"topic": k["topic"], "keywords": k["keywords"], "citations": k["citations"]}
        for k in KNOWLEDGE_BASE
    ]
