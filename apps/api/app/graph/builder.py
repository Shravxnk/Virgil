"""Graph builder: constructs transaction network graphs from case data."""

import networkx as nx

from app.core.data_loader import get_profile_by_account
from app.db.repositories.runtime_store import list_transactions


def build_transaction_graph(transaction_ids: list[str]) -> nx.DiGraph:
    """Build a directed graph from a list of transaction IDs.

    Includes the case's own transactions PLUS normal (non-flagged) transactions
    from the same accounts so the graph shows both suspicious (red) and
    legitimate (green) activity for contrast.
    """
    all_txns = list_transactions()
    case_txns = [t for t in all_txns if t["id"] in transaction_ids]
    case_txn_ids = set(transaction_ids)

    # Collect all accounts directly involved in the case
    case_accounts = set()
    for txn in case_txns:
        case_accounts.add(txn["from_account"])
        case_accounts.add(txn["to_account"])

    # Also pull in normal (non-flagged) transactions from those accounts
    # so the graph shows green "normal" counterparties alongside red ones
    neighbor_txns = []
    for txn in all_txns:
        if txn["id"] in case_txn_ids:
            continue
        if txn["from_account"] in case_accounts or txn["to_account"] in case_accounts:
            neighbor_txns.append(txn)

    combined_txns = case_txns + neighbor_txns

    G = nx.DiGraph()  # noqa: N806

    # Collect all account IDs across both case + neighbor transactions
    account_ids = set()
    for txn in combined_txns:
        account_ids.add(txn["from_account"])
        account_ids.add(txn["to_account"])

    for acc_id in account_ids:
        profile = get_profile_by_account(acc_id) or {}
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
            flagged=acc_id in case_accounts,
            metadata={
                "country": profile.get("country", profile.get("city", "Unknown")),
                "type": profile.get("account_type", profile.get("type", "unknown")),
                "flags": profile.get("flags", []),
            },
        )

    for txn in combined_txns:
        is_case_txn = txn["id"] in case_txn_ids
        G.add_edge(
            txn["from_account"],
            txn["to_account"],
            id=txn["id"],
            amount=txn["amount"],
            currency=txn["currency"],
            timestamp=txn["timestamp"],
            suspicious=is_case_txn,  # case transactions start as suspicious
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
