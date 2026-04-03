"""
Deterministic risk scoring engine.

Computes a fraud risk score from 0-100 based on:
- Transaction amount deviation from behavioral baseline
- Time-of-day anomaly
- Device trust and recognition
- Beneficiary risk assessment
- Graph/network signals

The score drives the automated decision:
  0-30   → approve
  30-60  → step-up MFA
  60-80  → manual review
  80-100 → block
"""

import math


def score_amount_anomaly(amount: float, baseline_avg: float) -> tuple[float, float]:
    """Score deviation of transaction amount from account baseline. Returns (score_component, deviation_ratio)."""
    if baseline_avg <= 0:
        return (15.0, 0.0) if amount > 50000 else (5.0, 0.0)

    ratio = amount / baseline_avg
    if ratio <= 1.5:
        return 0.0, ratio
    elif ratio <= 3.0:
        return 5.0 + (ratio - 1.5) * 4.0, ratio
    elif ratio <= 8.0:
        return 11.0 + (ratio - 3.0) * 2.0, ratio
    else:
        return min(25.0, 21.0 + math.log2(ratio - 7.0) * 3.0), ratio


def score_time_anomaly(
    transaction_hour: int,
    usual_start: int = 9,
    usual_end: int = 17,
) -> tuple[float, float]:
    """Score time-of-day anomaly. Returns (score_component, anomaly_degree 0-1)."""
    if usual_start <= transaction_hour <= usual_end:
        return 0.0, 0.0

    if usual_start <= usual_end:
        distance = min(
            abs(transaction_hour - usual_start),
            abs(transaction_hour - usual_end),
        )
    else:
        if transaction_hour >= usual_start or transaction_hour <= usual_end:
            return 0.0, 0.0
        distance = min(
            abs(transaction_hour - usual_start),
            abs(transaction_hour - usual_end),
        )

    anomaly = min(1.0, distance / 8.0)
    return anomaly * 15.0, anomaly


def score_device_risk(
    known_device: bool,
    trust_score: float,
    ip_risk: str = "low",
) -> tuple[float, bool]:
    """Score device and access risk. Returns (score_component, device_mismatch)."""
    score = 0.0
    mismatch = False

    if not known_device:
        score += 8.0
        mismatch = True

    if trust_score < 30:
        score += 7.0
    elif trust_score < 60:
        score += 3.0

    ip_scores = {"low": 0.0, "medium": 3.0, "high": 7.0}
    score += ip_scores.get(ip_risk, 0.0)

    return min(15.0, score), mismatch


def score_beneficiary_risk(
    is_first_time: bool,
    beneficiary_flags: list[str],
    beneficiary_risk_rating: str = "low",
) -> tuple[float, float]:
    """Score beneficiary risk. Returns (score_component, risk_level 0-1)."""
    score = 0.0

    if is_first_time:
        score += 3.0

    risk_map = {"low": 0.0, "medium": 4.0, "high": 8.0}
    score += risk_map.get(beneficiary_risk_rating, 0.0)

    flag_scores = {
        "prior_investigation": 5.0,
        "high_risk_jurisdiction": 4.0,
        "offshore_jurisdiction": 3.0,
        "shell_company_indicators": 4.0,
        "pep_connected": 2.0,
    }
    for flag in beneficiary_flags:
        score += flag_scores.get(flag, 1.0)

    capped = min(20.0, score)
    return capped, capped / 20.0


def score_graph_risk(
    circular_transfers: bool,
    hop_count: int,
    connected_suspicious: int,
    layering_detected: bool,
) -> tuple[float, float]:
    """Score network/graph risk signals. Returns (score_component, risk_level 0-1)."""
    score = 0.0

    if circular_transfers:
        score += 10.0
    if layering_detected:
        score += 8.0
    if hop_count >= 3:
        score += min(5.0, (hop_count - 2) * 2.0)
    if connected_suspicious > 0:
        score += min(7.0, connected_suspicious * 2.5)

    capped = min(25.0, score)
    return capped, capped / 25.0


def compute_risk_score(
    amount: float,
    baseline_avg: float,
    transaction_hour: int,
    usual_start: int,
    usual_end: int,
    known_device: bool,
    device_trust: float,
    ip_risk: str,
    is_first_time_beneficiary: bool,
    beneficiary_flags: list[str],
    beneficiary_risk_rating: str,
    circular_transfers: bool,
    hop_count: int,
    connected_suspicious: int,
    layering_detected: bool,
) -> dict:
    """Compute the full risk score and generate reason codes."""
    amount_score, amount_ratio = score_amount_anomaly(amount, baseline_avg)
    time_score, time_degree = score_time_anomaly(transaction_hour, usual_start, usual_end)
    device_score, device_mismatch = score_device_risk(known_device, device_trust, ip_risk)
    benef_score, benef_risk = score_beneficiary_risk(
        is_first_time_beneficiary, beneficiary_flags, beneficiary_risk_rating
    )
    graph_score, graph_risk = score_graph_risk(
        circular_transfers, hop_count, connected_suspicious, layering_detected
    )

    total = amount_score + time_score + device_score + benef_score + graph_score
    total = min(100.0, max(0.0, total))

    reason_codes = []
    if amount_ratio > 3.0:
        reason_codes.append(f"AMOUNT_DEVIATION_{amount_ratio:.1f}X")
    if time_degree > 0.3:
        reason_codes.append("TIME_ANOMALY")
    if device_mismatch:
        reason_codes.append("NEW_DEVICE")
    if ip_risk == "high":
        reason_codes.append("HIGH_RISK_IP")
    if is_first_time_beneficiary:
        reason_codes.append("FIRST_TIME_BENEFICIARY")
    if circular_transfers:
        reason_codes.append("CIRCULAR_TRANSFERS")
    if layering_detected:
        reason_codes.append("LAYERING_DETECTED")
    if connected_suspicious > 0:
        reason_codes.append(f"SUSPICIOUS_CONNECTIONS_{connected_suspicious}")
    for flag in beneficiary_flags:
        reason_codes.append(f"FLAG_{flag.upper()}")

    if total < 30:
        decision = "approve"
    elif total < 60:
        decision = "mfa"
    elif total < 80:
        decision = "manual_review"
    else:
        decision = "block"

    return {
        "score": round(total, 2),
        "decision": decision,
        "reason_codes": reason_codes,
        "behavioral_mismatch": round(min(1.0, amount_ratio / 10.0), 3),
        "device_mismatch": device_mismatch,
        "amount_anomaly": round(amount_ratio, 3),
        "time_anomaly": round(time_degree, 3),
        "beneficiary_risk": round(benef_risk, 3),
        "graph_risk": round(graph_risk, 3),
    }
