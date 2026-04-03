"""Dashboard routes."""

from fastapi import APIRouter
from app.services.dashboard_service import get_analyst_dashboard, get_executive_dashboard
from app.schemas.dashboard import AnalystDashboardResponse, ExecutiveDashboardResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/analyst", response_model=AnalystDashboardResponse)
async def analyst_dashboard():
    """Get the analyst dashboard with alerts overview, scoring distribution, and trends."""
    return await get_analyst_dashboard()


@router.get("/executive", response_model=ExecutiveDashboardResponse)
async def executive_dashboard():
    """Get the executive dashboard with KPIs, model health, compliance, and trends."""
    return await get_executive_dashboard()
