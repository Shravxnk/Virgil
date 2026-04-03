"""Tests for the graph analyzer."""

import pytest
from app.graph.analyzer import analyze_case_graph


def test_case_001_graph():
    """Test that CASE-001 circular transfer pattern is detected."""
    transaction_ids = ["TXN-001", "TXN-002", "TXN-003", "TXN-004", "TXN-005", "TXN-006"]
    result = analyze_case_graph(transaction_ids)

    assert len(result.nodes) >= 4
    assert len(result.edges) >= 6
    assert len(result.suspicious_paths) > 0
    assert any(edge.suspicious for edge in result.edges)


def test_case_005_graph():
    """Test that CASE-005 structuring pattern graph is built correctly."""
    transaction_ids = ["TXN-014", "TXN-015", "TXN-016", "TXN-017", "TXN-018", "TXN-019"]
    result = analyze_case_graph(transaction_ids)

    assert len(result.nodes) == 3  # ACC-010, ACC-011, ACC-012
    assert len(result.edges) == 6


def test_empty_graph():
    """Test handling of non-existent transactions."""
    result = analyze_case_graph(["FAKE-001"])
    assert len(result.nodes) == 0
    assert len(result.edges) == 0
