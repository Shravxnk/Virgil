from pydantic import BaseModel


class ModelHealth(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    last_retrained: str
    data_drift_score: float


class StatusCount(BaseModel):
    status: str
    count: int


class FraudTrendPoint(BaseModel):
    month: str
    detected: float
    prevented: float


class ComplianceSummary(BaseModel):
    sar_filed: int
    sar_pending: int
    ctr_filed: int
    last_audit_date: str
    next_audit_date: str
    compliance_score: float


class RiskCategory(BaseModel):
    category: str
    count: int
    amount: float


class ScoreDistribution(BaseModel):
    range: str
    count: int


class DailyTrend(BaseModel):
    date: str
    alerts: int
    resolved: int


class AnalystDashboardResponse(BaseModel):
    total_alerts: int
    critical_alerts: int
    pending_review: int
    resolved_today: int
    avg_risk_score: float
    recent_alerts: list[dict]
    score_distribution: list[ScoreDistribution]
    daily_trend: list[DailyTrend]


class ExecutiveDashboardResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    total_fraud_detected: float
    total_fraud_prevented: float
    active_cases: int
    false_positive_rate: float
    detection_rate: float
    avg_resolution_time: float
    regulatory_exposure: float
    model_accuracy: float
    model_precision: float
    model_recall: float
    model_f1: float
    cases_by_status: list[StatusCount]
    fraud_trend: list[FraudTrendPoint]
    compliance_summary: ComplianceSummary
    top_risk_categories: list[RiskCategory]
