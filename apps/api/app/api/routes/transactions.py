"""Transaction routes — pre-transaction scoring + queue + completed transactions."""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.db.repositories.transaction_repo import (
    submit_pre_txn,
    score_pre_txn,
    get_pre_txn,
    find_transactions,
    count_transactions,
)
from app.db import connection
from app.services.risk_scoring import score_transaction_params
from app.llm.explainer import generate_alert_explanation

router = APIRouter(prefix="/transactions", tags=["Transactions"])


class PreTxnRequest(BaseModel):
    from_account: str
    to_account: str
    amount: float
    txn_type: str = "UPI"
    channel: str = "mobile"
    device_id: Optional[str] = None
    device_known: bool = False
    ip_address: Optional[str] = None
    geo_location: Optional[str] = None
    upi_ref: Optional[str] = None
    currency: str = "INR"


@router.post("/score")
async def score_pre_transaction(req: PreTxnRequest):
    """Score a transaction BEFORE it executes. Returns real-time approve/block/mfa/manual_review decision."""
    # Submit to queue
    pre_id = await submit_pre_txn(
        from_account=req.from_account,
        to_account=req.to_account,
        amount=int(req.amount),
        txn_type=req.txn_type,
        channel=req.channel,
        device_id=req.device_id,
        device_known=req.device_known,
        ip_address=req.ip_address,
        geo_location=req.geo_location,
        upi_ref=req.upi_ref,
        currency=req.currency,
    )

    # Score the transaction using the deterministic engine
    result = score_transaction_params(
        from_account=req.from_account,
        to_account=req.to_account,
        amount=req.amount,
        txn_hour=datetime.now(timezone.utc).hour,
        device_known=req.device_known,
        device_trust=70 if req.device_known else 20,
        ip_risk="high" if req.ip_address and req.ip_address.startswith("185.") else "low",
        currency=req.currency,
    )

    # Store decision back in queue
    await score_pre_txn(
        pre_id=pre_id,
        risk_score=int(result["score"]),
        decision=result["decision"],
        risk_signals={
            "amount_anomaly": result["amount_anomaly"],
            "time_anomaly": result["time_anomaly"],
            "device_mismatch": result["device_mismatch"],
            "beneficiary_risk": result["beneficiary_risk"],
            "graph_risk": result["graph_risk"],
        },
    )

    # Generate AI explanation for high-risk transactions
    explanation = None
    if result["score"] >= 30:
        alert_data = {
            "id": pre_id,
            "alert_type": "pre_transaction_scoring",
            "title": f"Pre-transaction risk score {result['score']:.0f} — {result['decision'].upper()}",
            "account_name": req.from_account,
            "account_id": req.from_account,
            "amount": req.amount,
            "currency": req.currency,
            "risk_score": result["score"],
            "severity": "critical" if result["score"] >= 80 else "high" if result["score"] >= 60 else "medium",
            "description": f"Real-time scoring: {req.from_account} → {req.to_account} | ₹{req.amount:,.0f} | {req.txn_type}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "decision": result["decision"],
            "reason_codes": result["reason_codes"],
            "amount_anomaly": result["amount_anomaly"],
            "behavioral_mismatch": result["behavioral_mismatch"],
            "device_mismatch": result["device_mismatch"],
            "time_anomaly": result["time_anomaly"],
            "beneficiary_risk": result["beneficiary_risk"],
            "graph_risk": result["graph_risk"],
        }
        explanation = generate_alert_explanation(alert_data)

    return {
        "pre_txn_id": pre_id,
        "from_account": req.from_account,
        "to_account": req.to_account,
        "amount": req.amount,
        "currency": req.currency,
        "score": result["score"],
        "decision": result["decision"],
        "reason_codes": result["reason_codes"],
        "amount_anomaly": result["amount_anomaly"],
        "behavioral_mismatch": result["behavioral_mismatch"],
        "device_mismatch": result["device_mismatch"],
        "time_anomaly": result["time_anomaly"],
        "beneficiary_risk": result["beneficiary_risk"],
        "graph_risk": result["graph_risk"],
        "explanation": explanation,
        "scored_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/queue")
async def get_pre_txn_queue(limit: int = Query(50, le=200)):
    """View the pre-transaction scoring queue (pending + recent decisions)."""
    if not connection.PG_AVAILABLE:
        return {"queue": [], "total": 0, "message": "PostgreSQL not available"}
    pool = connection.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM pre_txn_queue ORDER BY created_at DESC LIMIT $1", limit
        )
    items = []
    for r in rows:
        items.append({
            "id": r["id"],
            "from_account": r["from_account"],
            "to_account": r["to_account"],
            "amount": r["amount"],
            "currency": r["currency"],
            "txn_type": r["txn_type"],
            "channel": r["channel"],
            "risk_score": r["risk_score"],
            "decision": r["decision"],
            "scored_at": r["scored_at"].isoformat() if r["scored_at"] else None,
            "completed": r["completed"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        })
    return {"queue": items, "total": len(items)}


@router.get("")
async def list_transactions(
    flagged: Optional[bool] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
):
    """List completed transactions. Use ?flagged=true to show only fraud-flagged ones."""
    txns = await find_transactions(flagged=flagged, limit=limit, skip=offset)
    total = await count_transactions(flagged=flagged)
    return {"transactions": txns, "total": total}
