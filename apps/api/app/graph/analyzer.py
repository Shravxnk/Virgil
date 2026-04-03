"""Graph analyzer: detects suspicious patterns in transaction graphs."""

import networkx as nx
from app.graph.builder import build_transaction_graph
from app.schemas.graph import GraphDataResponse, GraphNode, GraphEdge, GraphCluster


def analyze_case_graph(transaction_ids: list[str]) -> GraphDataResponse:
    """Build and analyze the transaction graph for a case."""
    G = build_transaction_graph(transaction_ids)

    nodes = []
    for node_id, data in G.nodes(data=True):
        nodes.append(
            GraphNode(
                id=node_id,
                label=data.get("label", node_id),
                type=data.get("type", "account"),
                risk_score=data.get("risk_score", 0),
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


def detect_suspicious_paths(G: nx.DiGraph) -> list[list[str]]:
    """Detect circular and suspicious fund flow paths."""
    paths = []

    # Detect cycles (circular transfers)
    try:
        cycles = list(nx.simple_cycles(G))
        for cycle in cycles:
            if len(cycle) >= 3:
                paths.append(cycle + [cycle[0]])  # Complete the cycle for display
    except nx.NetworkXError:
        pass

    # Detect long chains (multi-hop transfers)
    for node in G.nodes():
        if G.in_degree(node) == 0:  # Source nodes
            for target in G.nodes():
                if target != node and G.out_degree(target) == 0:
                    try:
                        for path in nx.all_simple_paths(G, node, target, cutoff=6):
                            if len(path) >= 3:
                                paths.append(path)
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


def detect_clusters(G: nx.DiGraph) -> list[GraphCluster]:
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
