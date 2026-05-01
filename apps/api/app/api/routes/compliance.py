"""Compliance routes — STR/CTR report details."""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

from app.db.repositories.runtime_store import list_cases, list_alerts

router = APIRouter(prefix="/compliance", tags=["Compliance"])

# ────────────────────────────────────────────────────────────────────────────
# Helper: derive STR/CTR report data from live cases + alerts
# ────────────────────────────────────────────────────────────────────────────

_FRAUD_TYPE_MAP = {
    "circular": "Circular Fund Flow / Layering",
    "ato": "Account Takeover (ATO)",
    "mule": "Mule Network",
    "structuring": "Structuring / Smurfing",
    "synthetic": "Synthetic Identity Fraud",
}

_LEGAL_BASIS_MAP = {
    "Circular Fund Flow / Layering": "PMLA 2002, Section 3 — Offence of money laundering; FATF Recommendation 16",
    "Account Takeover (ATO)": "IT Act 2000, Section 66C — Identity theft; Banking Regulation Act 1949, Section 35A",
    "Mule Network": "PMLA 2002, Section 3 — Offence of money laundering; IPC Section 420 — Cheating",
    "Structuring / Smurfing": "PMLA 2002, Section 3; RBI Master Direction on KYC 2016 — Structuring Alert",
    "Synthetic Identity Fraud": "IT Act 2000, Section 66D — Cheating by personation; PMLA 2002",
}

_FILING_DEADLINE_DAYS = 7  # FIU-IND STR deadline: 7 working days


def _derive_report_type(case: dict[str, Any]) -> str:
    """STR for fraud/suspicious activity; CTR for cash transactions above ₹10L."""
    title_lower = (case.get("title") or "").lower()
    desc_lower = (case.get("description") or "").lower()
    amount = float(case.get("total_exposure") or 0)
    if "cash" in title_lower or "cash" in desc_lower or (amount >= 1_000_000 and "cash" in desc_lower):
        return "CTR"
    return "STR"


def _derive_fraud_type(case: dict[str, Any]) -> str:
    title_lower = (case.get("title") or "").lower()
    for key, label in _FRAUD_TYPE_MAP.items():
        if key in title_lower:
            return label
    return "Suspicious Activity"


def _filing_status(case: dict[str, Any], report_type: str) -> str:
    status = case.get("status", "open")
    if status in ("resolved_fraud", "closed"):
        return "Filed"
    if status in ("investigating", "escalated"):
        return "Pending"
    return "Due"


def _build_str_ctr_record(case: dict[str, Any]) -> dict[str, Any]:
    report_type = _derive_report_type(case)
    fraud_type = _derive_fraud_type(case)
    filing_status = _filing_status(case, report_type)
    amount = float(case.get("total_exposure") or 0)

    created_at = case.get("created_at", "")
    try:
        created_dt = datetime.fromisoformat(created_at)
        if created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=timezone.utc)
    except Exception:
        created_dt = datetime.now(timezone.utc)

    deadline_dt = created_dt
    # Add 7 business days (approximate: skip weekends)
    days_added = 0
    while days_added < _FILING_DEADLINE_DAYS:
        deadline_dt = deadline_dt.replace(hour=0, minute=0, second=0)
        from datetime import timedelta
        deadline_dt = deadline_dt + timedelta(days=1)
        if deadline_dt.weekday() < 5:
            days_added += 1

    now = datetime.now(timezone.utc)
    is_overdue = filing_status == "Pending" and now > deadline_dt

    # Narrative: why was this flagged?
    evidence = case.get("evidence") or {}
    net_analysis = evidence.get("network_analysis") or {}
    behavioral = evidence.get("behavioral_analysis") or {}
    device = evidence.get("device_analysis") or {}

    reasons: list[str] = []
    if net_analysis.get("circular_transfers"):
        reasons.append(f"Circular fund transfer detected across {net_analysis.get('hop_count', 3)} accounts")
    if net_analysis.get("layering_detected"):
        reasons.append("Multi-layer transaction structuring consistent with PMLA Section 3 laundering")
    deviation = behavioral.get("deviation", 0)
    if deviation and float(deviation) > 5:
        reasons.append(f"Transaction amount {float(deviation):.1f}× above account behavioral baseline")
    if device.get("known_device") is False:
        reasons.append("Unrecognised device — Account Takeover indicator")
    ip_risk = device.get("ip_risk", "low")
    if ip_risk == "high":
        reasons.append("High-risk IP geolocation detected")
    if not reasons:
        reasons.append(case.get("description") or "Suspicious activity detected by automated scoring engine")

    legal_basis = _LEGAL_BASIS_MAP.get(fraud_type, "PMLA 2002, Section 3")

    # FIU-IND reference number format: FIU/STR/YYYY/NNNNN
    year = created_dt.year
    seq = abs(hash(case["id"])) % 99999
    report_id = f"FIU/{report_type}/{year}/{seq:05d}"

    return {
        "report_id": report_id,
        "case_id": case["id"],
        "report_type": report_type,
        "fraud_type": fraud_type,
        "filing_status": filing_status,
        "is_overdue": is_overdue,
        "risk_score": case.get("risk_score", 0),
        "total_exposure": amount,
        "primary_account": case.get("primary_account", ""),
        "subject_name": _extract_subject_name(case),
        "assigned_analyst": case.get("assigned_to", "Unassigned"),
        "case_title": case.get("title", ""),
        "description": case.get("description", ""),
        "recommended_action": case.get("recommended_action", ""),
        "created_at": created_dt.isoformat(),
        "filing_deadline": deadline_dt.isoformat(),
        "legal_basis": legal_basis,
        "reasons": reasons,
        "alert_count": case.get("alert_count", 0),
        "transaction_ids": case.get("transaction_ids", []),
        "case_status": case.get("status", "open"),
        "explanation": case.get("explanation", ""),
    }


def _extract_subject_name(case: dict[str, Any]) -> str:
    title = case.get("title") or ""
    # Pattern: "... — NAME (BANK ..."
    if " — " in title:
        parts = title.split(" — ", 1)
        if len(parts) > 1:
            # Take just the name before any parenthesis
            name_part = parts[1].split("(")[0].strip()
            return name_part
    return case.get("primary_account", "Unknown Subject")


# ────────────────────────────────────────────────────────────────────────────
# Routes
# ────────────────────────────────────────────────────────────────────────────

@router.get("/reports")
async def list_compliance_reports():
    """Return all STR/CTR reports derived from live case data."""
    cases = list_cases()

    # Only cases with meaningful exposure
    relevant = [c for c in cases if float(c.get("total_exposure") or 0) > 0 or c.get("status") in ("investigating", "escalated", "resolved_fraud")]

    reports = [_build_str_ctr_record(c) for c in relevant]

    # Sort: overdue first, then by creation date desc
    reports.sort(key=lambda r: (not r["is_overdue"], r["created_at"]), reverse=False)
    reports.sort(key=lambda r: r["is_overdue"], reverse=True)

    str_reports = [r for r in reports if r["report_type"] == "STR"]
    ctr_reports = [r for r in reports if r["report_type"] == "CTR"]

    total_exposure = sum(r["total_exposure"] for r in reports)
    filed_count = sum(1 for r in reports if r["filing_status"] == "Filed")
    pending_count = sum(1 for r in reports if r["filing_status"] == "Pending")
    overdue_count = sum(1 for r in reports if r["is_overdue"])

    return {
        "summary": {
            "total_reports": len(reports),
            "str_count": len(str_reports),
            "ctr_count": len(ctr_reports),
            "filed": filed_count,
            "pending": pending_count,
            "overdue": overdue_count,
            "total_exposure": total_exposure,
        },
        "reports": reports,
    }


@router.get("/reports/{case_id}")
async def get_compliance_report(case_id: str):
    """Return detailed STR/CTR report for a specific case."""
    cases = list_cases()
    case = next((c for c in cases if c["id"] == case_id), None)
    if not case:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return _build_str_ctr_record(case)


@router.get("/model-health")
async def get_model_health():
    """Return real-time model health metrics computed from live alert/case data."""
    from app.core.data_loader import load_executive_metrics
    from app.db.repositories.runtime_store import list_alerts, list_cases

    alerts = list_alerts()
    cases = list_cases()
    metrics = load_executive_metrics()
    model = metrics.get("model_health", {})

    # Compute live stats
    total_alerts = len(alerts)
    confirmed_fraud = sum(1 for c in cases if c.get("status") == "resolved_fraud")
    confirmed_legit = sum(1 for c in cases if c.get("status") == "resolved_legitimate")
    total_resolved = confirmed_fraud + confirmed_legit

    # Precision: confirmed_fraud / (confirmed_fraud + confirmed_legit)
    live_precision = (confirmed_fraud / total_resolved) if total_resolved > 0 else float(model.get("precision", 0.912))

    # Recall: use model metric (we don't know ground truth of missed fraud)
    live_recall = float(model.get("recall", 0.889))

    # F1
    if live_precision + live_recall > 0:
        live_f1 = 2 * live_precision * live_recall / (live_precision + live_recall)
    else:
        live_f1 = float(model.get("f1_score", 0.9))

    # False positive rate
    fp_rate = (confirmed_legit / total_resolved) if total_resolved > 0 else float(metrics.get("false_positive_rate", 0.082))

    # Score distribution from live alerts
    scores = [int(a.get("risk_score", 0)) for a in alerts]
    score_dist = {
        "0-29": sum(1 for s in scores if s < 30),
        "30-59": sum(1 for s in scores if 30 <= s < 60),
        "60-79": sum(1 for s in scores if 60 <= s < 80),
        "80-100": sum(1 for s in scores if s >= 80),
    }

    # Decision distribution
    decision_counts = {"approve": 0, "mfa": 0, "manual_review": 0, "block": 0}
    for a in alerts:
        score = int(a.get("risk_score", 0))
        if score < 30:
            decision_counts["approve"] += 1
        elif score < 60:
            decision_counts["mfa"] += 1
        elif score < 80:
            decision_counts["manual_review"] += 1
        else:
            decision_counts["block"] += 1

    # Signal importance (static from model design — these are weights, not learned)
    signal_importance = [
        {"signal": "Amount Deviation", "weight": 25, "description": "How far the transaction amount exceeds the account's 90-day rolling average. Zone 1-4 scoring with log tail for extreme values."},
        {"signal": "Graph / Network Risk", "weight": 25, "description": "NetworkX graph analysis: circular transfers (+10), layering (+8), hop count (+2/hop), suspicious connections (+2.5 each)."},
        {"signal": "Beneficiary Risk", "weight": 20, "description": "First-time recipient (+3), risk rating (+4/+8), prior investigation flags (+5), jurisdiction risk (+4), shell company indicators (+4)."},
        {"signal": "Device Trust", "weight": 15, "description": "Unknown device (+8), low trust score (+7), high-risk IP (+7). Strongest indicator of Account Takeover (ATO)."},
        {"signal": "Time Anomaly", "weight": 15, "description": "Hours outside normal banking window. Anomaly degree = distance ÷ 8hr reference. Score = anomaly × 15."},
    ]

    # Compute data drift from score variance vs baseline
    avg_score = sum(scores) / len(scores) if scores else 0
    baseline_avg = 45.0  # calibration baseline
    data_drift = abs(avg_score - baseline_avg) / baseline_avg * 100 if baseline_avg > 0 else float(model.get("data_drift_score", 0.043)) * 100

    # Reasons/insights
    insights: list[dict] = []
    if live_precision < 0.90:
        insights.append({"level": "warning", "metric": "Precision", "message": f"Precision at {live_precision:.1%} — review threshold calibration to reduce false positives."})
    else:
        insights.append({"level": "healthy", "metric": "Precision", "message": f"Precision at {live_precision:.1%} — within acceptable range. 1 in {round(1/(1-live_precision)) if live_precision < 1 else 100} alerts is a false positive."})

    if live_recall < 0.85:
        insights.append({"level": "critical", "metric": "Recall", "message": "Recall below 85% — scoring thresholds may be too conservative. Real fraud may be missed."})
    else:
        insights.append({"level": "healthy", "metric": "Recall", "message": f"Recall at {live_recall:.1%} — engine catches {live_recall:.1%} of all real fraud cases presented."})

    if data_drift > 10:
        insights.append({"level": "warning", "metric": "Data Drift", "message": f"Drift at {data_drift:.1f}% exceeds 10% threshold. Behavioral baselines need recalibration."})
    else:
        insights.append({"level": "healthy", "metric": "Data Drift", "message": f"Data drift {data_drift:.1f}% — well within 10% recalibration threshold. Baselines are current."})

    if fp_rate > 0.15:
        insights.append({"level": "warning", "metric": "False Positive Rate", "message": f"FP rate {fp_rate:.1%} — analysts spending time on non-fraud alerts. Consider raising thresholds."})
    else:
        insights.append({"level": "healthy", "metric": "False Positive Rate", "message": f"False positive rate {fp_rate:.1%} — within operational tolerance."})

    return {
        "engine_name": "Chakravyuh Rule-Based Scoring Engine v1.1",
        "engine_type": "Deterministic / Rule-Based + Graph Analytics",
        "status": "operational",
        "last_retrained": model.get("last_retrained", "2026-03-15"),
        "next_review": "2026-06-15",
        "metrics": {
            "accuracy": float(model.get("accuracy", 0.934)),
            "precision": live_precision,
            "recall": live_recall,
            "f1_score": live_f1,
            "roc_auc": float(model.get("roc_auc", 0.941)) if "roc_auc" in model else 0.941,
            "false_positive_rate": fp_rate,
        },
        "data_drift_pct": round(data_drift, 2),
        "total_alerts_scored": total_alerts,
        "confirmed_fraud_cases": confirmed_fraud,
        "confirmed_legit_cases": confirmed_legit,
        "score_distribution": score_dist,
        "decision_distribution": decision_counts,
        "signal_importance": signal_importance,
        "insights": insights,
        "architecture": [
            {"component": "Risk Scoring Engine", "status": "operational", "description": "5-component additive scoring (amount, time, device, beneficiary, graph). Deterministic — fully auditable."},
            {"component": "Graph Analytics (NetworkX)", "status": "operational", "description": "Directed graph analysis for circular transfers, multi-hop chains, and mule cluster detection."},
            {"component": "LLM Explainer (GPT-4o mini)", "status": "operational", "description": "OpenAI GPT-4o mini generates analyst briefings. Template fallback active when API unavailable."},
            {"component": "RAG Knowledge Base (ChromaDB)", "status": "operational", "description": "5 vector collections: fraud knowledge, case memory, policy playbook, report templates, behavioral context."},
        ],
    }
