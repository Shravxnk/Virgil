"""Transaction routes — pre-transaction scoring + queue + completed transactions."""

import asyncio
import uuid
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


def _fast_suggestion(item: dict) -> dict:
    """Instant rule-based AI suggestion — no LLM call, zero latency."""
    signals = item.get("risk_signals") or {}
    score = item.get("risk_score", 0) or 0
    device_mismatch = signals.get("device_mismatch", False)
    amount_anomaly = signals.get("amount_anomaly", 0) or 0
    graph_risk = signals.get("graph_risk", 0) or 0
    if score >= 75 or (device_mismatch and amount_anomaly > 5) or graph_risk > 0.5:
        return {
            "suggestion": "REJECT",
            "confidence": "High" if score >= 75 else "Medium",
            "reasoning": (
                f"Risk score {score}/100 with "
                f"{'unknown device, ' if device_mismatch else ''}"
                f"{amount_anomaly:.1f}x amount deviation"
                f"{', circular/network risk detected' if graph_risk > 0.5 else ''}. "
                f"Multiple converging signals suggest potential fraud. "
                f"Recommend rejection pending account holder verification."
            ),
            "action": "Call account holder on registered mobile to verify transaction intent.",
            "score": score,
        }
    elif score >= 65 or device_mismatch:
        return {
            "suggestion": "REJECT",
            "confidence": "Low",
            "reasoning": (
                f"Score {score}/100 is in the upper manual-review range. "
                f"{'Device is unrecognised. ' if device_mismatch else ''}"
                f"Amount deviation of {amount_anomaly:.1f}x. "
                f"Borderline — recommend additional verification before processing."
            ),
            "action": "Send OTP via registered mobile and verify device fingerprint.",
            "score": score,
        }
    else:
        return {
            "suggestion": "APPROVE",
            "confidence": "Medium",
            "reasoning": (
                f"Score {score}/100 — lower end of manual review range. "
                f"Amount deviation of {amount_anomaly:.1f}x is moderate. "
                f"No strong network or device signals. Likely a legitimate but unusual transaction."
            ),
            "action": "Spot-check account activity for past 7 days before approving.",
            "score": score,
        }


class PreTxnRequest(BaseModel):
    from_account: str
    to_account: str
    amount: float
    txn_type: str = "UPI"
    channel: str = "mobile"
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    device_known: bool = False
    ip_address: Optional[str] = None
    geo_location: Optional[str] = None
    upi_ref: Optional[str] = None
    currency: str = "INR"


def _severity_for_score(score: int) -> str:
    if score >= 80: return "critical"
    if score >= 65: return "high"
    if score >= 50: return "medium"
    return "low"


async def _auto_generate_alert_and_case(
    pre_id: str, req: PreTxnRequest, result: dict, scored_at: str
) -> tuple[str | None, str | None]:
    """
    For high-risk scored transactions, auto-create an alert (score ≥ 50)
    and a case (score ≥ 75). Returns (alert_id, case_id) or (None, None).
    """
    from app.db.repositories.alert_repo import insert_alert
    from app.db.repositories.case_repo import insert_case

    score = int(result["score"])
    decision = result["decision"]
    if decision == "approve":
        return None, None

    severity = _severity_for_score(score)
    alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
    alert_type_map = {
        "block": "high_risk_block",
        "manual_review": "manual_review_required",
        "mfa": "step_up_auth_triggered",
    }
    alert = {
        "id": alert_id,
        "case_id": None,
        "transaction_id": pre_id,
        "alert_type": alert_type_map.get(result["decision"], "risk_flag"),
        "severity": severity,
        "status": "investigating",
        "title": f"{result['decision'].upper()} — {req.from_account} → {req.to_account} ₹{int(req.amount):,}",
        "description": (
            f"Pre-transaction risk score {score}/100. "
            f"Decision: {result['decision'].upper()}. "
            f"Signals: amount_anomaly={result.get('amount_anomaly', 0):.1f}, "
            f"device_mismatch={result.get('device_mismatch', False)}, "
            f"time_anomaly={result.get('time_anomaly', 0):.1f}. "
            f"Channel: {req.txn_type} via {req.channel}."
        ),
        "risk_score": score,
        "timestamp": scored_at,
        "account_id": req.from_account,
        "account_name": req.from_account,
        "account_number": "",
        "bank": "",
        "ifsc": "",
        "amount": int(req.amount),
        "currency": req.currency,
        "utr": pre_id,
        "assigned_to": "Auto-assigned",
        "regulatory_ref": "PMLA 2002 Section 3" if score >= 75 else "",
    }
    await insert_alert(alert)

    case_id = None
    if decision in ("manual_review", "block"):
        case_id = f"CASE-{uuid.uuid4().hex[:6].upper()}"
        alert["case_id"] = case_id
        # Patch alert with case_id
        await insert_alert(alert)
        case = {
            "id": case_id,
            "status": "open",
            "title": f"Auto-detected: {req.txn_type} risk — {req.from_account}",
            "risk_score": score,
            "assigned_to": "Auto-assigned",
            "created_at": scored_at,
            "updated_at": scored_at,
            "total_exposure": int(req.amount),
            "alert_count": 1,
            "description": (
                f"Automatically opened from pre-transaction scoring. "
                f"Score {score}/100, decision {result['decision'].upper()}. "
                f"From account {req.from_account} attempting {req.txn_type} of "
                f"₹{int(req.amount):,} to {req.to_account} via {req.channel}. "
                f"Reason codes: {', '.join(result.get('reason_codes', []))}."
            ),
            "explanation": None,
            "recommended_action": (
                "Review transaction signals and account history. "
                "If fraud confirmed, freeze account and file STR with FIU-IND."
            ),
            "alert_ids": [alert_id],
            "transaction_ids": [pre_id],
            "primary_account": req.from_account,
            "evidence": {
                "behavioral_analysis": {
                    "baseline_avg_amount": 0,
                    "current_amount": int(req.amount),
                    "deviation": float(result.get("amount_anomaly", 0)),
                    "usual_time_range": "09:00-21:00 IST",
                    "transaction_time": datetime.now(timezone.utc).strftime("%H:%M IST"),
                    "time_anomaly": bool(result.get("time_anomaly", 0) > 30),
                    "usual_locations": [],
                    "transaction_location": req.geo_location or "",
                },
                "device_analysis": {
                    "known_device": req.device_known,
                    "device_id": req.device_id or "unknown",
                    "device_type": "Mobile" if req.channel == "mobile" else "Desktop",
                    "os": "Unknown",
                    "ip_address": req.ip_address or "",
                    "ip_risk": "high" if req.ip_address and req.ip_address.startswith("185.") else "low",
                    "geo_location": req.geo_location or "",
                },
                "network_analysis": {
                    "circular_transfers": bool(result.get("graph_risk", 0) > 50),
                    "hop_count": 1,
                    "connected_suspicious_accounts": 0,
                    "layering_detected": False,
                },
            },
            "alerts": [],
            "transactions": [],
            "timeline": [
                {
                    "timestamp": scored_at,
                    "event_type": "case_opened",
                    "description": f"Case auto-opened from pre-transaction scoring (score {score}/100)",
                    "actor": "System",
                    "metadata": {"pre_txn_id": pre_id, "decision": result["decision"]},
                }
            ],
            "similar_cases": [],
            "notes": [],
        }
        await insert_case(case)

    return alert_id, case_id


@router.post("/score")
async def score_pre_transaction(req: PreTxnRequest):
    """Score a transaction BEFORE it executes. Returns real-time approve/block/mfa/manual_review decision."""
    # ── Account validation ─────────────────────────────────────────────────
    from app.db.repositories.account_repo import find_account
    sender = await find_account(req.from_account)
    if not sender:
        raise HTTPException(
            status_code=422,
            detail=f"Account '{req.from_account}' not found. Seed accounts first via /api/accounts.",
        )
    receiver = await find_account(req.to_account)
    if not receiver:
        raise HTTPException(
            status_code=422,
            detail=f"Account '{req.to_account}' not found. Seed accounts first via /api/accounts.",
        )

    # Submit to queue
    pre_id = await submit_pre_txn(
        from_account=req.from_account,
        to_account=req.to_account,
        amount=int(req.amount),
        txn_type=req.txn_type,
        channel=req.channel,
        device_id=req.device_id,
        device_name=req.device_name,
        device_known=req.device_known,
        ip_address=req.ip_address,
        geo_location=req.geo_location,
        upi_ref=req.upi_ref,
        currency=req.currency,
    )

    # Score the transaction using the deterministic engine (offload to thread)
    result = await asyncio.to_thread(
        score_transaction_params,
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

    scored_at = datetime.now(timezone.utc).isoformat()

    # Auto-generate alert + case for high-risk decisions (score ≥ 50)
    alert_id, case_id = None, None
    try:
        alert_id, case_id = await _auto_generate_alert_and_case(pre_id, req, result, scored_at)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Auto-alert/case failed for %s: %s", pre_id, exc)

    # ── Broadcast to all SSE-connected dashboards ──────────────────────────
    try:
        from app.api.routes.events import broadcast
        await broadcast("transaction_scored", {
            "pre_txn_id": pre_id,
            "from_account": req.from_account,
            "from_name": sender.get("name", req.from_account),
            "to_account": req.to_account,
            "to_name": receiver.get("name", req.to_account),
            "amount": req.amount,
            "currency": req.currency,
            "txn_type": req.txn_type,
            "channel": req.channel,
            "device_name": req.device_name,
            "geo_location": req.geo_location,
            "score": result["score"],
            "decision": result["decision"],
            "scored_at": scored_at,
            "alert_id": alert_id,
            "case_id": case_id,
        })
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("SSE broadcast failed: %s", exc)

    return {
        "pre_txn_id": pre_id,
        "from_account": req.from_account,
        "from_name": sender.get("name", req.from_account),
        "to_account": req.to_account,
        "to_name": receiver.get("name", req.to_account),
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
        "explanation": None,
        "alert_id": alert_id,
        "case_id": case_id,
        "scored_at": scored_at,
    }


@router.get("/score/{pre_id}/explain")
async def explain_pre_transaction(pre_id: str):
    """Fetch AI explanation for a pre-transaction score. Slower — calls OpenAI."""
    item = await get_pre_txn(pre_id)
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")
    alert_data = {
        "id": pre_id,
        "alert_type": "pre_transaction_scoring",
        "title": f"Pre-transaction risk score {item.get('risk_score', 0):.0f} — {item.get('decision', '').upper()}",
        "account_name": item.get("from_account", ""),
        "account_id": item.get("from_account", ""),
        "amount": item.get("amount", 0),
        "currency": item.get("currency", "INR"),
        "risk_score": item.get("risk_score", 0),
        "severity": "critical" if item.get("risk_score", 0) >= 80 else "high" if item.get("risk_score", 0) >= 60 else "medium",
        "description": f"{item.get('txn_type')} via {item.get('channel')}",
        "timestamp": item.get("created_at", ""),
        "decision": item.get("decision", ""),
        "reason_codes": item.get("risk_signals", {}).get("reason_codes", []),
        "amount_anomaly": item.get("risk_signals", {}).get("amount_anomaly", 0),
        "behavioral_mismatch": item.get("risk_signals", {}).get("amount_anomaly", 0),
        "device_mismatch": item.get("risk_signals", {}).get("device_mismatch", False),
        "time_anomaly": item.get("risk_signals", {}).get("time_anomaly", 0),
        "beneficiary_risk": item.get("risk_signals", {}).get("beneficiary_risk", 0),
        "graph_risk": item.get("risk_signals", {}).get("graph_risk", 0),
    }
    explanation = await asyncio.to_thread(generate_alert_explanation, alert_data)
    return {"pre_txn_id": pre_id, "explanation": explanation}


@router.get("/queue")
async def get_pre_txn_queue(limit: int = Query(50, le=200)):
    """View the pre-transaction scoring queue (pending + recent decisions)."""
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM pre_txn_queue ORDER BY created_at DESC LIMIT $1", limit
            )
        if rows:
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
                    "device_name": r["device_name"],
                    "geo_location": r["geo_location"],
                    "risk_score": r["risk_score"],
                    "decision": r["decision"],
                    "scored_at": r["scored_at"].isoformat() if r["scored_at"] else None,
                    "completed": r["completed"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                })
            return {"queue": items, "total": len(items)}

    # Fall back to runtime store
    from app.db.repositories.runtime_store import list_pre_txn_queue
    items = list_pre_txn_queue(limit)
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
    """Return all transactions pending manual analyst review (decision=manual_review, not resolved).
    Includes fast rule-based AI suggestions (no LLM call — instant response)."""
    items = await get_manual_review_queue(limit=limit)
    enriched = [{**item, "ai_suggestion": _fast_suggestion(item)} for item in items]
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
    explanation = await asyncio.to_thread(generate_alert_explanation, alert_data)
    suggestion = await asyncio.to_thread(generate_manual_review_suggestion, item)

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
