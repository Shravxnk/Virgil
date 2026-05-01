"""Case routes."""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Query

from app.llm.explainer import generate_case_summary
from app.schemas.case import CaseDetailResponse, CaseListResponse
from app.services.case_service import get_all_cases, get_case_detail

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases", tags=["Cases"])


@router.get("", response_model=CaseListResponse)
async def list_cases(
    status: str | None = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all cases with optional status filtering."""
    try:
        return await get_all_cases(status=status, limit=limit, offset=offset)
    except Exception as exc:
        logger.exception("list_cases failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Cases error: {exc}") from exc


@router.get("/{case_id}", response_model=CaseDetailResponse)
async def get_case(case_id: str):
    """Get detailed case information. Explanation omitted for speed — use /explain endpoint."""
    case = await get_case_detail(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return case


@router.get("/{case_id}/explain")
async def explain_case(case_id: str):
    """Generate an AI-powered investigation summary for a case. Slower — calls OpenAI."""
    case = await get_case_detail(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    explanation = await asyncio.to_thread(generate_case_summary, case.model_dump())
    return {"case_id": case_id, "explanation": explanation}
