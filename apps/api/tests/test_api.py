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
    response = client.get("/api/alerts/ALT-001")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "ALT-001"


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
    response = client.get("/api/cases/CASE-001")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "CASE-001"
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
    response = client.get("/api/graph/CASE-001")
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
    assert "recent_alerts" in data


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
