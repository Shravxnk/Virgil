"""Dashboard service: assembles analyst and executive dashboard data."""

from app.core.data_loader import load_alerts, load_executive_metrics
from app.schemas.dashboard import (
    AnalystDashboardResponse,
    ExecutiveDashboardResponse,
    ComplianceSummary,
    StatusCount,
    FraudTrendPoint,
    RiskCategory,
    ScoreDistribution,
    DailyTrend,
)


def get_analyst_dashboard() -> AnalystDashboardResponse:
    alerts = load_alerts()
    metrics = load_executive_metrics()

    total_alerts = len(alerts)
    critical_alerts = len([a for a in alerts if a["severity"] == "critical"])
    pending_review = len([a for a in alerts if a["status"] == "new"])
    resolved_today = 3  # simulated

    scores = [a["risk_score"] for a in alerts]
    avg_score = sum(scores) / len(scores) if scores else 0

    recent = sorted(alerts, key=lambda a: a["timestamp"], reverse=True)[:5]

    return AnalystDashboardResponse(
        total_alerts=total_alerts,
        critical_alerts=critical_alerts,
        pending_review=pending_review,
        resolved_today=resolved_today,
        avg_risk_score=round(avg_score, 1),
        recent_alerts=recent,
        score_distribution=[
            ScoreDistribution(**s) for s in metrics["score_distribution"]
        ],
        daily_trend=[DailyTrend(**d) for d in metrics["daily_trend"]],
    )


def get_executive_dashboard() -> ExecutiveDashboardResponse:
    metrics = load_executive_metrics()
    model = metrics["model_health"]

    return ExecutiveDashboardResponse(
        total_fraud_detected=metrics["total_fraud_detected"],
        active_cases=metrics["active_cases"],
        false_positive_rate=metrics["false_positive_rate"],
        detection_rate=metrics["detection_rate"],
        avg_resolution_time=metrics["avg_resolution_time_hours"],
        regulatory_exposure=metrics["regulatory_exposure"],
        model_accuracy=model["accuracy"],
        model_precision=model["precision"],
        model_recall=model["recall"],
        model_f1=model["f1_score"],
        cases_by_status=[StatusCount(**s) for s in metrics["cases_by_status"]],
        fraud_trend=[FraudTrendPoint(**f) for f in metrics["fraud_trend"]],
        compliance_summary=ComplianceSummary(**metrics["compliance_summary"]),
        top_risk_categories=[RiskCategory(**r) for r in metrics["top_risk_categories"]],
    )
