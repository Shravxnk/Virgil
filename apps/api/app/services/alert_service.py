"""Alert service: manages alert retrieval and filtering."""

from app.core.data_loader import load_alerts
from app.schemas.alert import AlertResponse, AlertListResponse


async def get_all_alerts(
    severity: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> AlertListResponse:
    from app.db import connection
    if connection.PG_AVAILABLE:
        from app.db.repositories.alert_repo import find_alerts, count_alerts
        alerts = await find_alerts(severity=severity, status=status, limit=limit, skip=offset)
        total = await count_alerts(severity=severity, status=status)
        return AlertListResponse(alerts=[AlertResponse(**a) for a in alerts], total=total)

    # JSON fallback
    alerts = load_alerts()
    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]
    if status:
        alerts = [a for a in alerts if a["status"] == status]
    total = len(alerts)
    paginated = alerts[offset: offset + limit]
    return AlertListResponse(alerts=[AlertResponse(**a) for a in paginated], total=total)


async def get_alert_by_id(alert_id: str) -> AlertResponse | None:
    from app.db import connection
    if connection.PG_AVAILABLE:
        from app.db.repositories.alert_repo import find_alert_by_id
        data = await find_alert_by_id(alert_id)
        return AlertResponse(**data) if data else None

    for alert in load_alerts():
        if alert["id"] == alert_id:
            return AlertResponse(**alert)
    return None

