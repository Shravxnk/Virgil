"""Transaction routes — pre-transaction scoring + queue + completed transactions."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db import connection
from app.db.repositories.transaction_repo import (
    count_transactions,
    find_transactions,
    get_manual_review_queue,
    get_pre_txn,
    resolve_manual_review,
    score_pre_txn,
    submit_pre_txn,
)
from app.llm.explainer import generate_alert_explanation, generate_manual_review_suggestion
from app.services.risk_scoring import score_transaction_params

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
            "description": (
                f"Real-time scoring: {req.from_account} → {req.to_account}"
                f" | ₹{req.amount:,.0f} | {req.txn_type}"
            ),
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


# ---------------------------------------------------------------------------
# Manual Review Queue
# ---------------------------------------------------------------------------

@router.get("/manual-review")
async def get_manual_review_list(limit: int = Query(50, le=200)):
    """Return all transactions pending manual analyst review (decision=manual_review, not resolved)."""
    items = await get_manual_review_queue(limit=limit)
    # Enrich each item with AI suggestion
    enriched = []
    for item in items:
        suggestion = generate_manual_review_suggestion(item)
        enriched.append({**item, "ai_suggestion": suggestion})
    return {"manual_review": enriched, "total": len(enriched)}


@router.get("/manual-review/{pre_id}")
async def get_manual_review_item(pre_id: str):
    """Get a single manual-review transaction with full AI analysis."""
    item = await get_pre_txn(pre_id)
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if item.get("decision") not in ("manual_review",) and item.get("completed"):
        raise HTTPException(status_code=400, detail="Transaction already resolved")

    # Full AI explanation
    alert_data = {
        "id": item["id"],
        "alert_type": "manual_review",
        "title": f"Manual Review — {item['from_account']} → {item['to_account']} ₹{item['amount']:,}",
        "account_name": item["from_account"],
        "account_id": item["from_account"],
        "amount": item["amount"],
        "currency": item.get("currency", "INR"),
        "risk_score": item.get("risk_score", 0),
        "severity": "high",
        "description": f"{item['txn_type']} via {item['channel']}",
        "timestamp": item.get("created_at", ""),
        "decision": "manual_review",
        "reason_codes": [],
        "amount_anomaly": item.get("risk_signals", {}).get("amount_anomaly", 0),
        "behavioral_mismatch": item.get("risk_signals", {}).get("amount_anomaly", 0),
        "device_mismatch": item.get("risk_signals", {}).get("device_mismatch", False),
        "time_anomaly": item.get("risk_signals", {}).get("time_anomaly", 0),
        "beneficiary_risk": item.get("risk_signals", {}).get("beneficiary_risk", 0),
        "graph_risk": item.get("risk_signals", {}).get("graph_risk", 0),
    }
    explanation = generate_alert_explanation(alert_data)
    suggestion = generate_manual_review_suggestion(item)

    return {**item, "explanation": explanation, "ai_suggestion": suggestion}


class ReviewDecisionRequest(BaseModel):
    decision: str   # "approved" or "rejected"
    note: str = ""


@router.post("/manual-review/{pre_id}/decide")
async def decide_manual_review(pre_id: str, body: ReviewDecisionRequest):
    """Analyst approves or rejects a manual-review transaction."""
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be 'approved' or 'rejected'")

    updated = await resolve_manual_review(pre_id, body.decision, body.note)
    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found, already resolved, or not in manual_review state",
        )
    return {
        "pre_txn_id": pre_id,
        "analyst_decision": body.decision,
        "resolved_at": datetime.now(timezone.utc).isoformat(),
        "message": f"Transaction {pre_id} has been {body.decision} by analyst.",
    }
