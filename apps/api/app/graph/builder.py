"""Graph builder: constructs transaction network graphs from case data."""

import networkx as nx
from app.core.data_loader import load_transactions, load_user_profiles


def build_transaction_graph(transaction_ids: list[str]) -> nx.DiGraph:
    """Build a directed graph from a list of transaction IDs."""
    all_txns = load_transactions()
    txns = [t for t in all_txns if t["id"] in transaction_ids]
    profiles = {p.get("account_id", p.get("id", "")): p for p in load_user_profiles()}

    G = nx.DiGraph()

    account_ids = set()
    for txn in txns:
        account_ids.add(txn["from_account"])
        account_ids.add(txn["to_account"])

    for acc_id in account_ids:
        profile = profiles.get(acc_id, {})
        node_type = "account"
        if acc_id.startswith("EXT-"):
            node_type = "external"
        elif profile.get("risk_rating") == "high":
            node_type = "suspicious"

        G.add_node(
            acc_id,
            label=profile.get("name", acc_id),
            type=node_type,
            risk_score=_estimate_node_risk(profile),
            metadata={
                "country": profile.get("country", "Unknown"),
                "type": profile.get("type", "unknown"),
                "flags": profile.get("flags", []),
            },
        )

    for txn in txns:
        G.add_edge(
            txn["from_account"],
            txn["to_account"],
            id=txn["id"],
            amount=txn["amount"],
            currency=txn["currency"],
            timestamp=txn["timestamp"],
            suspicious=False,
        )

    return G


def _estimate_node_risk(profile: dict) -> float:
    """Estimate risk score for a node based on profile flags."""
    if not profile:
        return 50.0

    score = 20.0
    risk_map = {"low": 0, "medium": 15, "high": 30}
    score += risk_map.get(profile.get("risk_rating", "low"), 0)

    flag_scores = {
        "prior_investigation": 15,
        "high_risk_jurisdiction": 10,
        "offshore_jurisdiction": 8,
        "shell_company_indicators": 12,
        "pep_connected": 8,
        "new_account": 5,
        "thin_credit_file": 8,
    }
    for flag in profile.get("flags", []):
        score += flag_scores.get(flag, 3)

    return min(100, score)
