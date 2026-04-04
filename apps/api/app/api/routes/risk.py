"""Risk scoring routes."""

from fastapi import APIRouter, Query

from app.llm.explainer import generate_alert_explanation
from app.schemas.risk import RiskScoreResponse
from app.services.risk_scoring import score_transaction

router = APIRouter(prefix="/risk", tags=["Risk Scoring"])


@router.get("/score", response_model=RiskScoreResponse)
async def get_risk_score(transaction_id: str = Query(..., description="Transaction ID to score")):
    """Score a transaction for fraud risk. Returns risk score, decision, and reason codes.
    Explanation is omitted for speed — fetch it via /risk/explain if needed."""
    return score_transaction(transaction_id)


@router.get("/explain")
async def explain_risk_score(transaction_id: str = Query(..., description="Transaction ID to explain")):
    """Generate an AI explanation for a transaction's risk score. Slower — calls OpenAI."""
    import asyncio
    result = score_transaction(transaction_id)
    alert_data = {
        "id": f"LIVE-{transaction_id}",
        "alert_type": "pre_transaction_scoring",
        "title": f"Risk score {result.score} for transaction {transaction_id}",
        "account_name": transaction_id,
        "account_id": transaction_id,
        "amount": 0,
        "currency": "INR",
        "risk_score": result.score,
        "severity": "high" if result.score >= 60 else "medium",
        "description": f"Reason codes: {', '.join(result.reason_codes)}",
        "timestamp": "",
    }
    explanation = await asyncio.to_thread(generate_alert_explanation, alert_data)
    return {"transaction_id": transaction_id, "score": result.score, "explanation": explanation}
