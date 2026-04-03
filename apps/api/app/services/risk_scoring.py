"""Risk scoring service: orchestrates scoring for a given transaction."""

from datetime import datetime

from app.core.data_loader import (
    get_devices_for_account,
    get_profile_by_account,
    get_transaction_by_id,
    load_transactions,
)
from app.core.scoring import compute_risk_score
from app.schemas.risk import Decision, RiskScoreResponse


def _parse_usual_hours(time_range: str) -> tuple[int, int]:
    """Parse usual time range like '09:00-17:00 EST' into (start_hour, end_hour)."""
    try:
        parts = time_range.split()[0]
        start, end = parts.split("-")
        return int(start.split(":")[0]), int(end.split(":")[0])
    except (ValueError, IndexError):
        return 9, 17


def _check_graph_signals(account_id: str, transactions: list[dict]) -> dict:
    """Quick graph signal check for an account."""
    related = [
        t for t in transactions
        if t["from_account"] == account_id or t["to_account"] == account_id
    ]

    counterparties = set()
    for t in related:
        if t["from_account"] == account_id:
            counterparties.add(t["to_account"])
        else:
            counterparties.add(t["from_account"])

    # Check for circular patterns (simplified)
    circular = False
    for cp in counterparties:
        cp_targets = {
            t["to_account"] for t in transactions
            if t["from_account"] == cp
        }
        if account_id in cp_targets:
            circular = True
            break

    hop_count = len(counterparties)

    return {
        "circular_transfers": circular,
        "hop_count": hop_count,
        "connected_suspicious": 0,
        "layering_detected": circular and hop_count >= 3,
    }


def score_transaction(transaction_id: str) -> RiskScoreResponse:
    """Score a transaction and return the risk assessment."""
    txn = get_transaction_by_id(transaction_id)
    if not txn:
        return RiskScoreResponse(
            transaction_id=transaction_id,
            score=0,
            decision=Decision.approve,
            reason_codes=["TRANSACTION_NOT_FOUND"],
            behavioral_mismatch=0,
            device_mismatch=False,
            amount_anomaly=0,
            time_anomaly=0,
            beneficiary_risk=0,
            graph_risk=0,
            explanation="Transaction not found in system.",
        )

    sender_profile = get_profile_by_account(txn["from_account"])
    receiver_profile = get_profile_by_account(txn["to_account"])
    sender_devices = get_devices_for_account(txn["from_account"])
    all_transactions = load_transactions()

    baseline_avg = sender_profile["avg_transaction_amount"] if sender_profile else 0
    usual_start, usual_end = (
        _parse_usual_hours(sender_profile["usual_transaction_times"])
        if sender_profile
        else (9, 17)
    )

    txn_time = datetime.fromisoformat(txn["timestamp"].replace("Z", "+00:00"))
    txn_hour = txn_time.hour

    known_device = any(d["trust_score"] > 50 for d in sender_devices) if sender_devices else True
    device_trust = (
        max(d["trust_score"] for d in sender_devices) if sender_devices else 70
    )

    # Check if device used has low trust (potential new/compromised device)
    recent_devices = sorted(sender_devices, key=lambda d: d["last_seen"], reverse=True)
    if recent_devices and recent_devices[0]["trust_score"] < 30:
        known_device = False
        device_trust = recent_devices[0]["trust_score"]

    ip_risk = "low"
    if recent_devices:
        # Use lowest trust device's implied risk
        if recent_devices[0]["trust_score"] < 20:
            ip_risk = "high"
        elif recent_devices[0]["trust_score"] < 50:
            ip_risk = "medium"

    is_first_time = True
    if sender_profile:
        is_first_time = txn["to_account"] not in sender_profile.get("usual_counterparties", [])

    beneficiary_flags = receiver_profile.get("flags", []) if receiver_profile else []
    beneficiary_risk = receiver_profile.get("risk_rating", "low") if receiver_profile else "low"

    graph_signals = _check_graph_signals(txn["from_account"], all_transactions)

    result = compute_risk_score(
        amount=txn["amount"],
        baseline_avg=baseline_avg,
        transaction_hour=txn_hour,
        usual_start=usual_start,
        usual_end=usual_end,
        known_device=known_device,
        device_trust=device_trust,
        ip_risk=ip_risk,
        is_first_time_beneficiary=is_first_time,
        beneficiary_flags=beneficiary_flags,
        beneficiary_risk_rating=beneficiary_risk,
        **graph_signals,
    )

    return RiskScoreResponse(
        transaction_id=transaction_id,
        score=result["score"],
        decision=Decision(result["decision"]),
        reason_codes=result["reason_codes"],
        behavioral_mismatch=result["behavioral_mismatch"],
        device_mismatch=result["device_mismatch"],
        amount_anomaly=result["amount_anomaly"],
        time_anomaly=result["time_anomaly"],
        beneficiary_risk=result["beneficiary_risk"],
        graph_risk=result["graph_risk"],
        explanation=None,
    )


def score_transaction_params(
    from_account: str,
    to_account: str,
    amount: float,
    txn_hour: int,
    device_known: bool = False,
    device_trust: float = 70.0,
    ip_risk: str = "low",
    currency: str = "INR",
) -> dict:
    """Score a transaction from raw parameters (pre-transaction, before DB entry exists)."""
    sender_profile = get_profile_by_account(from_account)
    receiver_profile = get_profile_by_account(to_account)
    all_transactions = load_transactions()

    baseline_avg = sender_profile["avg_transaction_amount"] if sender_profile else 0
    usual_start, usual_end = (
        _parse_usual_hours(sender_profile["usual_transaction_times"])
        if sender_profile
        else (9, 17)
    )

    is_first_time = True
    if sender_profile:
        is_first_time = to_account not in sender_profile.get("usual_counterparties", [])

    beneficiary_flags = receiver_profile.get("flags", []) if receiver_profile else []
    beneficiary_risk = receiver_profile.get("risk_rating", "low") if receiver_profile else "low"

    graph_signals = _check_graph_signals(from_account, all_transactions)

    return compute_risk_score(
        amount=amount,
        baseline_avg=baseline_avg,
        transaction_hour=txn_hour,
        usual_start=usual_start,
        usual_end=usual_end,
        known_device=device_known,
        device_trust=device_trust,
        ip_risk=ip_risk,
        is_first_time_beneficiary=is_first_time,
        beneficiary_flags=beneficiary_flags,
        beneficiary_risk_rating=beneficiary_risk,
        **graph_signals,
    )
