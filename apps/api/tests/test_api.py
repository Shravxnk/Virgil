"""Tests for API endpoints."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_api_root():
    response = client.get("/api")
    assert response.status_code == 200
    data = response.json()
    assert "endpoints" in data


def test_list_alerts():
    response = client.get("/api/alerts")
    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert data["total"] >= 1


def test_get_alert():
    first = client.get("/api/alerts").json()["alerts"][0]["id"]
    response = client.get(f"/api/alerts/{first}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == first


def test_alert_not_found():
    response = client.get("/api/alerts/NONEXISTENT")
    assert response.status_code == 404


def test_list_cases():
    response = client.get("/api/cases")
    assert response.status_code == 200
    data = response.json()
    assert "cases" in data
    assert data["total"] >= 1


def test_get_case():
    first = client.get("/api/cases").json()["cases"][0]["id"]
    response = client.get(f"/api/cases/{first}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == first
    assert "evidence" in data
    assert "timeline" in data


def test_case_not_found():
    response = client.get("/api/cases/NONEXISTENT")
    assert response.status_code == 404


def test_risk_score():
    response = client.get("/api/risk/score?transaction_id=TXN-001")
    assert response.status_code == 200
    data = response.json()
    assert "score" in data
    assert "decision" in data
    assert 0 <= data["score"] <= 100


def test_case_graph():
    first = client.get("/api/cases").json()["cases"][0]["id"]
    response = client.get(f"/api/graph/{first}")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert "suspicious_paths" in data


def test_analyst_dashboard():
    response = client.get("/api/dashboard/analyst")
    assert response.status_code == 200
    data = response.json()
    assert "total_alerts" in data
    assert data["total_alerts"] >= 1, "Dashboard showing 0 alerts — _fetch_all_alerts fallback broken"
    assert data["critical_alerts"] >= 1, "Expected at least 1 critical alert from sample data"
    assert data["pending_review"] >= 1, "Expected at least 1 pending/investigating alert"
    assert "recent_alerts" in data
    assert len(data["recent_alerts"]) >= 1, "recent_alerts list is empty"
    # Daily trend must have 14 entries and at least one non-zero day
    assert len(data["daily_trend"]) == 14, "Daily trend should have 14 days"
    total_in_trend = sum(d["alerts"] for d in data["daily_trend"])
    assert total_in_trend >= 1, "All days in daily_trend show 0 alerts — date bucketing broken"


def test_executive_dashboard():
    response = client.get("/api/dashboard/executive")
    assert response.status_code == 200
    data = response.json()
    assert "total_fraud_detected" in data
    assert "model_accuracy" in data
    assert "compliance_summary" in data


def test_feedback():
    response = client.post("/api/feedback/confirm", json={
        "case_id": "CASE-001",
        "confirmed_fraud": True,
        "analyst_id": "analyst-1",
        "notes": "Confirmed circular fund flow pattern",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "resolved_fraud"


def test_knowledge_search():
    response = client.post("/api/knowledge/search", json={
        "query": "circular transfer detection",
        "top_k": 3,
    })
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert data["collection_used"] is not None


# ---------------------------------------------------------------------------
# Transaction write + read round-trip
# ---------------------------------------------------------------------------

def test_list_transactions():
    """Transactions endpoint must return data (seeded from JSON or PG)."""
    response = client.get("/api/transactions")
    assert response.status_code == 200
    data = response.json()
    assert "transactions" in data
    assert data["total"] >= 1, "Expected at least one transaction — check seeding"


def test_pre_transaction_score_writes_and_returns():
    """POST /transactions/score must return a pre_txn_id, score, and decision."""
    response = client.post("/api/transactions/score", json={
        "from_account": "ACC-001",
        "to_account": "ACC-002",
        "amount": 500000,
        "txn_type": "NEFT",
        "channel": "netbanking",
    })
    assert response.status_code == 200
    data = response.json()
    assert "pre_txn_id" in data, "Expected pre_txn_id in response"
    assert data["pre_txn_id"].startswith("PRE-"), "pre_txn_id should start with PRE-"
    assert "score" in data and 0 <= data["score"] <= 100
    assert data["decision"] in ("approve", "block", "mfa", "manual_review")
    assert "scored_at" in data


def test_high_risk_transaction_creates_alert_and_case():
    """A block-decision transaction (high risk IP + unknown device + large amount) must auto-create an alert and case."""
    response = client.post("/api/transactions/score", json={
        "from_account": "ACC-003",
        "to_account": "ACC-999",
        "amount": 9500000,
        "txn_type": "RTGS",
        "channel": "netbanking",
        "device_known": False,
        "ip_address": "185.220.101.55",
        "geo_location": "Lagos, Nigeria",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["score"] >= 50, f"Expected high score for obvious fraud signals, got {data['score']}"
    assert data["alert_id"] is not None, "Expected alert_id to be generated for high-risk transaction"
    if data["score"] >= 75:
        assert data["case_id"] is not None, "Expected case_id to be generated for score ≥ 75"
        # Verify the case is immediately fetchable
        case_resp = client.get(f"/api/cases/{data['case_id']}")
        assert case_resp.status_code == 200, f"Auto-generated case {data['case_id']} not found via GET /cases"
    # Verify the alert is immediately fetchable
    alert_resp = client.get(f"/api/alerts/{data['alert_id']}")
    assert alert_resp.status_code == 200, f"Auto-generated alert {data['alert_id']} not found via GET /alerts"


def test_response_dates_are_recent():
    """Timestamps returned from the API should be within the last 30 days."""
    from datetime import datetime, timezone, timedelta

    first = client.get("/api/alerts").json()["alerts"][0]["id"]
    response = client.get(f"/api/alerts/{first}")
    assert response.status_code == 200
    ts_str = response.json().get("timestamp")
    assert ts_str, "Alert missing timestamp field"
    ts = datetime.fromisoformat(ts_str)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    age = datetime.now(tz=timezone.utc) - ts
    assert age.days <= 30, (
        f"Alert timestamp is {age.days} days old — expected fresh normalised data, got {ts_str}"
    )


def test_transaction_dates_are_recent():
    """Transaction timestamps returned from the API should be within the last 30 days."""
    from datetime import datetime, timezone

    response = client.get("/api/transactions")
    assert response.status_code == 200
    txns = response.json()["transactions"]
    assert txns, "No transactions returned"
    ts_str = txns[0].get("timestamp") or txns[0].get("ts")
    assert ts_str, "First transaction missing timestamp/ts field"
    ts = datetime.fromisoformat(ts_str)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    age = datetime.now(tz=timezone.utc) - ts
    assert age.days <= 30, (
        f"Transaction timestamp is {age.days} days old — expected fresh normalised data, got {ts_str}"
    )


def test_case_detail_has_transactions():
    """First case must return its linked transactions — tests transaction_repo runtime store fallback."""
    cases = client.get("/api/cases").json()["cases"]
    # find first case that declares transaction_ids
    case_id = None
    for c in cases:
        detail = client.get(f"/api/cases/{c['id']}").json()
        if detail.get("transaction_ids"):
            case_id = c["id"]
            data = detail
            break
    assert case_id is not None, "No case with transaction_ids found"
    assert "transaction_ids" in data, "Case detail missing transaction_ids"
    assert len(data["transaction_ids"]) >= 1, f"{case_id} should have at least 1 linked transaction ID"
    txns = data.get("transactions", [])
    assert len(txns) >= 1, (
        f"Expected resolved transaction objects, got empty list. "
        f"transaction_ids={data['transaction_ids']} — find_transaction_by_id fallback may be broken."
    )
