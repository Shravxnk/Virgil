"""Tests for the graph analyzer."""

import pytest
from app.graph.analyzer import analyze_case_graph


def test_case_001_graph():
    """Test that CASE-GEN-001 circular transfer pattern is detected."""
    # TXN-GEN-001: ACC-001→ACC-011, TXN-GEN-002: ACC-011→ACC-021, TXN-GEN-011: ACC-001→ACC-023
    transaction_ids = ["TXN-GEN-001", "TXN-GEN-002", "TXN-GEN-011"]
    result = analyze_case_graph(transaction_ids)

    assert len(result.nodes) >= 3
    assert len(result.edges) >= 2
    assert len(result.suspicious_paths) > 0


def test_case_005_graph():
    """Test that CASE-GEN-005 mule network graph is built correctly."""
    # TXN-GEN-007: ACC-008→ACC-016, TXN-GEN-014: ACC-008→ACC-017
    transaction_ids = ["TXN-GEN-007", "TXN-GEN-014"]
    result = analyze_case_graph(transaction_ids)

    assert len(result.nodes) == 3  # ACC-008, ACC-016, ACC-017
    assert len(result.edges) == 2


def test_empty_graph():
    """Test handling of non-existent transactions."""
    result = analyze_case_graph(["FAKE-001"])
    assert len(result.nodes) == 0
    assert len(result.edges) == 0
