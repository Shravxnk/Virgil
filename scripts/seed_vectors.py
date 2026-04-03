"""
Seed ChromaDB vector store with fraud knowledge base, policies, and templates.

Usage:
    cd apps/api
    python -m scripts.seed_vectors

Or from project root:
    python scripts/seed_vectors.py
"""

import sys
import os

# Add the api app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))

from app.retrieval.vector_store import seed_all_collections


def main():
    print("=" * 60)
    print("Chakravyuh — Vector Store Seeding")
    print("=" * 60)
    print()
    print("Seeding all ChromaDB collections...")
    print("  • fraud_knowledge")
    print("  • case_memory")
    print("  • policy_playbook")
    print("  • report_templates")
    print("  • behavioral_context")
    print()

    seed_all_collections()

    print()
    print("✓ All collections seeded successfully.")


if __name__ == "__main__":
    main()
