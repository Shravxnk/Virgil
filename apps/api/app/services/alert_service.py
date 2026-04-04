"""Alert service: manages alert retrieval and filtering."""

from app.schemas.alert import AlertListResponse, AlertResponse


async def get_all_alerts(
    severity: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> AlertListResponse:
    from app.db.repositories.alert_repo import count_alerts, find_alerts
    alerts = await find_alerts(severity=severity, status=status, limit=limit, skip=offset)
    total = await count_alerts(severity=severity, status=status)
    return AlertListResponse(alerts=[AlertResponse(**a) for a in alerts], total=total)


async def get_alert_by_id(alert_id: str) -> AlertResponse | None:
    from app.db.repositories.alert_repo import find_alert_by_id
    data = await find_alert_by_id(alert_id)
    return AlertResponse(**data) if data else None

