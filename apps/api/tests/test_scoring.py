"""Tests for the risk scoring engine."""

import pytest
from app.core.scoring import (
    score_amount_anomaly,
    score_time_anomaly,
    score_device_risk,
    score_beneficiary_risk,
    score_graph_risk,
    compute_risk_score,
)


class TestAmountAnomaly:
    def test_normal_amount(self):
        score, ratio = score_amount_anomaly(1000, 1200)
        assert score == 0.0
        assert ratio < 1.5

    def test_high_deviation(self):
        score, ratio = score_amount_anomaly(50000, 5000)
        assert score > 15.0
        assert ratio == 10.0

    def test_zero_baseline(self):
        score, _ = score_amount_anomaly(100000, 0)
        assert score == 15.0


class TestTimeAnomaly:
    def test_normal_hours(self):
        score, anomaly = score_time_anomaly(14, 9, 17)
        assert score == 0.0
        assert anomaly == 0.0

    def test_late_night(self):
        score, anomaly = score_time_anomaly(3, 9, 17)
        assert score > 5.0
        assert anomaly > 0.3


class TestDeviceRisk:
    def test_known_device(self):
        score, mismatch = score_device_risk(True, 85)
        assert score < 5.0
        assert mismatch is False

    def test_unknown_device_high_risk(self):
        score, mismatch = score_device_risk(False, 10, "high")
        assert score >= 15.0
        assert mismatch is True


class TestBeneficiaryRisk:
    def test_known_low_risk(self):
        score, risk = score_beneficiary_risk(False, [], "low")
        assert score == 0.0

    def test_first_time_flagged(self):
        score, risk = score_beneficiary_risk(True, ["prior_investigation", "high_risk_jurisdiction"], "high")
        assert score >= 15.0


class TestGraphRisk:
    def test_no_signals(self):
        score, risk = score_graph_risk(False, 1, 0, False)
        assert score == 0.0

    def test_circular_layering(self):
        score, risk = score_graph_risk(True, 4, 3, True)
        assert score >= 20.0


class TestFullScoring:
    def test_low_risk_transaction(self):
        result = compute_risk_score(
            amount=1000, baseline_avg=1200, transaction_hour=14,
            usual_start=9, usual_end=17, known_device=True,
            device_trust=90, ip_risk="low",
            is_first_time_beneficiary=False, beneficiary_flags=[],
            beneficiary_risk_rating="low", circular_transfers=False,
            hop_count=1, connected_suspicious=0, layering_detected=False,
        )
        assert result["decision"] == "approve"
        assert result["score"] < 30

    def test_high_risk_transaction(self):
        result = compute_risk_score(
            amount=245000, baseline_avg=45000, transaction_hour=3,
            usual_start=9, usual_end=17, known_device=False,
            device_trust=10, ip_risk="high",
            is_first_time_beneficiary=True,
            beneficiary_flags=["prior_investigation", "offshore_jurisdiction"],
            beneficiary_risk_rating="high",
            circular_transfers=True, hop_count=4,
            connected_suspicious=3, layering_detected=True,
        )
        assert result["decision"] == "block"
        assert result["score"] >= 80
