"""Alert service: manages alert retrieval and filtering."""

from app.core.data_loader import load_alerts
from app.schemas.alert import AlertResponse, AlertListResponse


def get_all_alerts(
    severity: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> AlertListResponse:
    alerts = load_alerts()

    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]
    if status:
        alerts = [a for a in alerts if a["status"] == status]

    total = len(alerts)
    paginated = alerts[offset : offset + limit]

    return AlertListResponse(
        alerts=[AlertResponse(**a) for a in paginated],
        total=total,
    )


def get_alert_by_id(alert_id: str) -> AlertResponse | None:
    for alert in load_alerts():
        if alert["id"] == alert_id:
            return AlertResponse(**alert)
    return None
