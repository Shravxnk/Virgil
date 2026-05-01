"""Graph analyzer: detects suspicious patterns in transaction graphs."""

import networkx as nx

from app.graph.builder import build_transaction_graph
from app.schemas.graph import GraphCluster, GraphDataResponse, GraphEdge, GraphNode


def analyze_case_graph(transaction_ids: list[str]) -> GraphDataResponse:
    """Build and analyze the transaction graph for a case."""
    G = build_transaction_graph(transaction_ids)  # noqa: N806

    nodes = []
    for node_id, data in G.nodes(data=True):
        nodes.append(
            GraphNode(
                id=node_id,
                label=data.get("label", node_id),
                type=data.get("type", "account"),
                risk_score=data.get("risk_score", 0),
                flagged=data.get("flagged", False),
                metadata=data.get("metadata", {}),
            )
        )

    edges = []
    for source, target, data in G.edges(data=True):
        edges.append(
            GraphEdge(
                id=data.get("id", f"{source}-{target}"),
                source=source,
                target=target,
                amount=data.get("amount", 0),
                currency=data.get("currency", "INR"),
                timestamp=data.get("timestamp", ""),
                suspicious=data.get("suspicious", False),
            )
        )

    suspicious_paths = detect_suspicious_paths(G)
    clusters = detect_clusters(G)

    # Mark suspicious edges
    suspicious_accounts = set()
    for path in suspicious_paths:
        suspicious_accounts.update(path)
    for edge in edges:
        if edge.source in suspicious_accounts and edge.target in suspicious_accounts:
            edge.suspicious = True

    return GraphDataResponse(
        nodes=nodes,
        edges=edges,
        suspicious_paths=suspicious_paths,
        clusters=clusters,
    )


def detect_suspicious_paths(G: nx.DiGraph) -> list[list[str]]:  # noqa: N803
    """Detect circular and suspicious fund flow paths."""
    from itertools import islice

    paths = []

    # Detect cycles (circular transfers) — cap at 20 cycles
    try:
        for cycle in islice(nx.simple_cycles(G), 20):
            if len(cycle) >= 3:
                paths.append(cycle + [cycle[0]])
    except nx.NetworkXError:
        pass

    # Detect long chains (multi-hop transfers) — cap sources/sinks and results
    sources = [n for n in G.nodes() if G.in_degree(n) == 0][:10]
    sinks = [n for n in G.nodes() if G.out_degree(n) == 0][:10]
    chain_count = 0
    for node in sources:
        if chain_count >= 50:
            break
        for target in sinks:
            if target == node:
                continue
            try:
                for path in islice(nx.all_simple_paths(G, node, target, cutoff=5), 5):
                    if len(path) >= 3:
                        paths.append(path)
                        chain_count += 1
                        if chain_count >= 50:
                            break
            except nx.NetworkXError:
                pass

    # Deduplicate
    seen = set()
    unique_paths = []
    for path in paths:
        key = tuple(path)
        if key not in seen:
            seen.add(key)
            unique_paths.append(path)

    return unique_paths


def detect_clusters(G: nx.DiGraph) -> list[GraphCluster]:  # noqa: N803
    """Detect suspicious clusters of closely connected accounts."""
    clusters = []
    undirected = G.to_undirected()

    components = list(nx.connected_components(undirected))
    for i, component in enumerate(components):
        if len(component) >= 3:
            subgraph = G.subgraph(component)
            avg_risk = sum(
                subgraph.nodes[n].get("risk_score", 0) for n in component
            ) / len(component)

            clusters.append(
                GraphCluster(
                    id=f"cluster-{i+1}",
                    node_ids=list(component),
                    risk_score=round(avg_risk, 2),
                )
            )

    return clusters
