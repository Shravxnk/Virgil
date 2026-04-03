"""Dashboard service: assembles analyst and executive dashboard data from live DB."""

import json
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from app.core.data_loader import load_executive_metrics
from app.db import connection
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _fetch_all_alerts() -> list[dict]:
    """Return all alerts from DB (or JSON fallback)."""
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT data FROM alerts ORDER BY created_at DESC")
        return [json.loads(r["data"]) for r in rows]
    from app.core.data_loader import load_alerts
    return load_alerts()


async def _fetch_all_cases() -> list[dict]:
    """Return all cases from DB (or JSON fallback)."""
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT data FROM cases")
        return [json.loads(r["data"]) for r in rows]
    from app.core.data_loader import load_cases
    return load_cases()


async def _fetch_flagged_transactions() -> list[dict]:
    """Return all flagged/fraud transactions from DB (or JSON fallback)."""
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, from_account, to_account, amount, currency, txn_type, "
                "channel, status, risk_score, flagged, ts FROM transactions WHERE flagged = TRUE"
            )
        return [dict(r) for r in rows]
    from app.core.data_loader import load_transactions
    txns = load_transactions()
    return [t for t in txns if t.get("flagged")]


# ---------------------------------------------------------------------------
# Analyst dashboard — fully live
# ---------------------------------------------------------------------------

async def get_analyst_dashboard() -> AnalystDashboardResponse:
    alerts = await _fetch_all_alerts()
    today = datetime.now(timezone.utc).date()

    total_alerts = len(alerts)
    critical_alerts = sum(1 for a in alerts if a.get("severity") == "critical")
    pending_review = sum(1 for a in alerts if a.get("status") in ("new", "open"))
    resolved_today = sum(
        1 for a in alerts
        if a.get("status") == "resolved"
        and a.get("timestamp", "")[:10] == str(today)
    )

    scores = [a.get("risk_score", 0) for a in alerts]
    avg_score = sum(scores) / len(scores) if scores else 0

    recent = sorted(alerts, key=lambda a: a.get("timestamp", ""), reverse=True)[:5]

    # Score distribution: bucket into 0-20, 21-40, 41-60, 61-80, 81-100
    buckets: dict[str, int] = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for a in alerts:
        s = a.get("risk_score", 0)
        if s <= 20:
            buckets["0-20"] += 1
        elif s <= 40:
            buckets["21-40"] += 1
        elif s <= 60:
            buckets["41-60"] += 1
        elif s <= 80:
            buckets["61-80"] += 1
        else:
            buckets["81-100"] += 1
    score_distribution = [ScoreDistribution(range=k, count=v) for k, v in buckets.items()]

    # Daily trend: last 14 days
    daily: dict[str, dict] = {}
    for d in range(13, -1, -1):
        day = str((datetime.now(timezone.utc) - timedelta(days=d)).date())
        daily[day] = {"alerts": 0, "resolved": 0}
    for a in alerts:
        ts = a.get("timestamp", "")[:10]
        if ts in daily:
            daily[ts]["alerts"] += 1
            if a.get("status") == "resolved":
                daily[ts]["resolved"] += 1
    daily_trend = [
        DailyTrend(date=d, alerts=v["alerts"], resolved=v["resolved"])
        for d, v in daily.items()
    ]

    return AnalystDashboardResponse(
        total_alerts=total_alerts,
        critical_alerts=critical_alerts,
        pending_review=pending_review,
        resolved_today=resolved_today,
        avg_risk_score=round(avg_score, 1),
        recent_alerts=recent,
        score_distribution=score_distribution,
        daily_trend=daily_trend,
    )


# ---------------------------------------------------------------------------
# Executive dashboard — fully live
# ---------------------------------------------------------------------------

async def get_executive_dashboard() -> ExecutiveDashboardResponse:
    # Keep model health + compliance from JSON (they reflect validated model metrics)
    metrics = load_executive_metrics()
    model = metrics["model_health"]
    compliance = metrics["compliance_summary"]

    alerts = await _fetch_all_alerts()
    cases = await _fetch_all_cases()
    flagged_txns = await _fetch_flagged_transactions()

    # Total fraud detected: sum of amounts on flagged transactions
    total_fraud_detected = sum(
        float(t.get("amount", 0)) for t in flagged_txns
    )
    if total_fraud_detected == 0:
        # Fall back to case exposure totals if no flagged txn amounts available
        total_fraud_detected = sum(float(c.get("total_exposure", 0)) for c in cases)

    # Active cases (any non-terminal status)
    terminal = {"resolved_fraud", "resolved_legitimate", "closed"}
    active_cases = sum(1 for c in cases if c.get("status") not in terminal)

    # Cases by status (live)
    status_counter: dict[str, int] = defaultdict(int)
    for c in cases:
        status_counter[c.get("status", "unknown")] += 1
    cases_by_status = [StatusCount(status=s, count=n) for s, n in status_counter.items()]

    # False positive rate: resolved_legitimate / all resolved
    resolved_total = sum(
        1 for c in cases if c.get("status") in {"resolved_fraud", "resolved_legitimate"}
    )
    resolved_legit = sum(1 for c in cases if c.get("status") == "resolved_legitimate")
    false_positive_rate = (resolved_legit / resolved_total) if resolved_total else metrics.get("false_positive_rate", 0.08)

    # Detection rate from model metrics (stable, model-driven)
    detection_rate = metrics.get("detection_rate", 0.94)

    # Avg resolution time from case timelines
    resolution_times = []
    for c in cases:
        timeline = c.get("timeline", [])
        opened = next((e for e in timeline if e.get("event_type") == "case_opened"), None)
        closed_ev = next(
            (e for e in reversed(timeline) if e.get("event_type") in ("case_resolved", "case_closed")),
            None,
        )
        if opened and closed_ev:
            try:
                t0 = datetime.fromisoformat(opened["timestamp"].replace("Z", "+00:00"))
                t1 = datetime.fromisoformat(closed_ev["timestamp"].replace("Z", "+00:00"))
                resolution_times.append((t1 - t0).total_seconds() / 3600)
            except Exception:
                pass
    avg_resolution_time = (
        round(sum(resolution_times) / len(resolution_times), 1)
        if resolution_times
        else metrics.get("avg_resolution_time_hours", 18.5)
    )

    # Regulatory exposure: open + investigating case total_exposure
    regulatory_statuses = {"open", "investigating", "escalated"}
    regulatory_exposure = sum(
        float(c.get("total_exposure", 0))
        for c in cases if c.get("status") in regulatory_statuses
    )
    if regulatory_exposure == 0:
        regulatory_exposure = metrics.get("regulatory_exposure", 0)

    # Fraud trend: group flagged txns or case exposure by month
    month_amounts: dict[str, float] = defaultdict(float)
    month_prevented: dict[str, float] = defaultdict(float)
    for t in flagged_txns:
        ts_raw = t.get("ts") or t.get("timestamp", "")
        if ts_raw:
            try:
                month = str(ts_raw)[:7]  # YYYY-MM
                month_amounts[month] += float(t.get("amount", 0))
                # Treat block/mfa decisions as prevented
                if t.get("status") in ("blocked", "rejected"):
                    month_prevented[month] += float(t.get("amount", 0))
            except Exception:
                pass
    if not month_amounts:
        # Fall back to case timeline for fraud trend
        for c in cases:
            if c.get("status") == "resolved_fraud":
                for ev in c.get("timeline", []):
                    if ev.get("event_type") == "case_opened":
                        try:
                            month = ev["timestamp"][:7]
                            month_amounts[month] += float(c.get("total_exposure", 0))
                        except Exception:
                            pass
    fraud_trend_months = sorted(month_amounts.keys())[-6:]
    fraud_trend = [
        FraudTrendPoint(
            month=m,
            detected=round(month_amounts[m], 0),
            prevented=round(month_prevented.get(m, month_amounts[m] * 0.35), 0),
        )
        for m in fraud_trend_months
    ]
    if not fraud_trend:
        fraud_trend = [FraudTrendPoint(**f) for f in metrics.get("fraud_trend", [])]

    # Top risk categories: group alerts by type
    cat_counts: dict[str, int] = defaultdict(int)
    cat_amounts: dict[str, float] = defaultdict(float)
    for a in alerts:
        cat = a.get("alert_type", "unknown")
        cat_counts[cat] += 1
        cat_amounts[cat] += float(a.get("amount", 0))
    top_categories = sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)[:6]
    top_risk_categories = [
        RiskCategory(category=cat, count=cnt, amount=round(cat_amounts[cat], 0))
        for cat, cnt in top_categories
    ]
    if not top_risk_categories:
        top_risk_categories = [RiskCategory(**r) for r in metrics.get("top_risk_categories", [])]

    return ExecutiveDashboardResponse(
        total_fraud_detected=round(total_fraud_detected, 2),
        active_cases=active_cases,
        false_positive_rate=round(false_positive_rate, 4),
        detection_rate=detection_rate,
        avg_resolution_time=avg_resolution_time,
        regulatory_exposure=round(regulatory_exposure, 2),
        model_accuracy=model["accuracy"],
        model_precision=model["precision"],
        model_recall=model["recall"],
        model_f1=model["f1_score"],
        cases_by_status=cases_by_status,
        fraud_trend=fraud_trend,
        compliance_summary=ComplianceSummary(**compliance),
        top_risk_categories=top_risk_categories,
    )
