"""Dashboard routes."""

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.dashboard import AnalystDashboardResponse, ExecutiveDashboardResponse
from app.services.dashboard_service import get_analyst_dashboard, get_executive_dashboard

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/analyst", response_model=AnalystDashboardResponse)
async def analyst_dashboard():
    """Get the analyst dashboard with alerts overview, scoring distribution, and trends."""
    try:
        return await get_analyst_dashboard()
    except Exception as exc:
        logger.exception("analyst_dashboard failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Dashboard error: {exc}") from exc


@router.get("/executive", response_model=ExecutiveDashboardResponse)
async def executive_dashboard():
    """Get the executive dashboard with KPIs, model health, compliance, and trends."""
    try:
        return await get_executive_dashboard()
    except Exception as exc:
        logger.exception("executive_dashboard failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Dashboard error: {exc}") from exc
