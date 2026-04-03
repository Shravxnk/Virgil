"""Alert routes."""

from fastapi import APIRouter, Query, HTTPException
from app.services.alert_service import get_all_alerts, get_alert_by_id
from app.schemas.alert import AlertResponse, AlertListResponse
from app.llm.explainer import generate_alert_explanation

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=AlertListResponse)
async def list_alerts(
    severity: str | None = Query(None, description="Filter by severity"),
    status: str | None = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all alerts with optional filtering."""
    return get_all_alerts(severity=severity, status=status, limit=limit, offset=offset)


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: str):
    """Get a specific alert by ID."""
    alert = get_alert_by_id(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return alert


@router.get("/{alert_id}/explain")
async def explain_alert(alert_id: str):
    """Get an LLM-generated explanation for an alert."""
    alert = get_alert_by_id(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")

    explanation = generate_alert_explanation(alert.model_dump())
    return {"alert_id": alert_id, "explanation": explanation}
