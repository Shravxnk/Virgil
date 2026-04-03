"""Vector store: local retrieval layer using ChromaDB for fraud intelligence.

Maintains separate collections for:
1. fraud_knowledge - Fraud patterns, indicators, and detection methods
2. case_memory - Historical case data and outcomes
3. policy_playbook - Action playbooks and regulatory requirements
4. report_templates - Narrative and report templates
5. behavioral_context - Behavioral analysis baselines and anomalies
"""

import os
import hashlib
from typing import Optional

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

from app.config import get_settings

_client = None
_collections: dict = {}

COLLECTION_NAMES = [
    "fraud_knowledge",
    "case_memory",
    "policy_playbook",
    "report_templates",
    "behavioral_context",
]


def get_chroma_client():
    global _client
    if not CHROMA_AVAILABLE:
        return None
    if _client is None:
        _client = chromadb.Client()
    return _client


def get_collection(name: str):
    if name not in COLLECTION_NAMES:
        return None
    client = get_chroma_client()
    if client is None:
        return None
    if name not in _collections:
        _collections[name] = client.get_or_create_collection(
            name=name,
            metadata={"description": f"Chakravyuh {name} collection"},
        )
    return _collections[name]


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    lines = text.split("\n")
    current = []
    current_len = 0

    for line in lines:
        current.append(line)
        current_len += len(line) + 1
        if current_len >= chunk_size:
            chunks.append("\n".join(current))
            keep = max(1, len(current) - 2)
            current = current[keep:]
            current_len = sum(len(l) + 1 for l in current)

    if current:
        chunks.append("\n".join(current))

    return chunks


def seed_collection(name: str, documents: list[str], source: str = "manual"):
    """Seed a collection with documents."""
    collection = get_collection(name)
    if collection is None:
        return

    for i, doc in enumerate(documents):
        chunks = _chunk_text(doc)
        for j, chunk in enumerate(chunks):
            doc_id = hashlib.md5(f"{source}:{i}:{j}:{chunk[:50]}".encode()).hexdigest()
            collection.upsert(
                ids=[doc_id],
                documents=[chunk],
                metadatas=[{"source": source, "chunk_index": j}],
            )


def search_collection(
    name: str,
    query: str,
    top_k: int = 5,
) -> list[dict]:
    """Search a collection and return matching documents."""
    collection = get_collection(name)
    if collection is None:
        return []

    try:
        results = collection.query(
            query_texts=[query],
            n_results=min(top_k, collection.count()) if collection.count() > 0 else 1,
        )
    except Exception:
        return []

    documents = results.get("documents", [[]])[0]
    distances = results.get("distances", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    return [
        {
            "content": doc,
            "source": meta.get("source", "unknown"),
            "relevance_score": round(1.0 / (1.0 + dist), 4),
        }
        for doc, dist, meta in zip(documents, distances, metadatas)
    ]


def seed_all_collections():
    """Seed all collections with bundled sample data."""
    from app.core.data_loader import load_fraud_kb, load_policy_playbook, load_reporting_templates, load_cases

    seed_collection("fraud_knowledge", [load_fraud_kb()], source="fraud_knowledge_base.md")
    seed_collection("policy_playbook", [load_policy_playbook()], source="policy_playbook.md")
    seed_collection("report_templates", [load_reporting_templates()], source="reporting_templates.md")

    # Seed case memory with historical case descriptions
    cases = load_cases()
    case_docs = [
        f"Case {c['id']}: {c['title']}. {c['description']} Risk: {c['risk_score']}/100. "
        f"Status: {c['status']}. Exposure: \u20b9{c['total_exposure']:,.0f}."
        for c in cases
    ]
    seed_collection("case_memory", case_docs, source="historical_cases")

    # Seed behavioral context
    from app.core.data_loader import load_user_profiles
    profiles = load_user_profiles()
    behavioral_docs = [
        f"Account {p.get('account_id', p.get('id', 'N/A'))} "
        f"({p.get('account_holder', p.get('name', 'Unknown'))}): "
        f"{p.get('account_type', p.get('type', 'unknown'))} account. "
        f"City: {p.get('city', p.get('country', 'N/A'))}. "
        f"Avg transaction: \u20b9{p.get('avg_transaction_amount', 0):,.0f}. "
        f"Risk: {p.get('risk_rating', 'low')}. "
        f"Flags: {', '.join(p.get('flags', [])) if p.get('flags') else 'none'}."
        for p in profiles
    ]
    seed_collection("behavioral_context", behavioral_docs, source="user_profiles")


def route_query(query: str, screen: Optional[str] = None) -> str:
    """Route a query to the most appropriate collection based on context."""
    query_lower = query.lower()

    if screen == "report" or "report" in query_lower or "sar" in query_lower:
        return "report_templates"
    if screen == "case" or "case" in query_lower or "investigation" in query_lower:
        return "case_memory"
    if screen == "policy" or "policy" in query_lower or "action" in query_lower or "playbook" in query_lower:
        return "policy_playbook"
    if screen == "behavioral" or "behavior" in query_lower or "baseline" in query_lower:
        return "behavioral_context"

    return "fraud_knowledge"
