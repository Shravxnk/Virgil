"""Risk scoring routes."""

from fastapi import APIRouter, Query
from app.services.risk_scoring import score_transaction
from app.schemas.risk import RiskScoreResponse
from app.llm.explainer import generate_alert_explanation

router = APIRouter(prefix="/risk", tags=["Risk Scoring"])


@router.get("/score", response_model=RiskScoreResponse)
async def get_risk_score(transaction_id: str = Query(..., description="Transaction ID to score")):
    """Score a transaction for fraud risk. Returns risk score, decision, and reason codes."""
    result = score_transaction(transaction_id)

    if result.score >= 30 and result.explanation is None:
        alert_data = {
            "id": f"LIVE-{transaction_id}",
            "alert_type": "pre_transaction_scoring",
            "title": f"Risk score {result.score} for transaction {transaction_id}",
            "account_name": transaction_id,
            "account_id": transaction_id,
            "amount": 0,
            "currency": "USD",
            "risk_score": result.score,
            "severity": "high" if result.score >= 60 else "medium",
            "description": f"Reason codes: {', '.join(result.reason_codes)}",
            "timestamp": "",
        }
        result.explanation = generate_alert_explanation(alert_data)

    return result
