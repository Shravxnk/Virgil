"""Chain-of-custody hashing and other security utilities."""

import hashlib
import json
from datetime import datetime


def compute_custody_hash(case_data: dict, report_id: str) -> str:
    """Compute a SHA-256 hash for chain-of-custody verification."""
    payload = {
        "report_id": report_id,
        "case_id": case_data.get("id", ""),
        "generated_at": datetime.utcnow().isoformat(),
        "evidence_hash": hashlib.sha256(
            json.dumps(case_data.get("evidence", {}), sort_keys=True).encode()
        ).hexdigest(),
        "transaction_ids": sorted(case_data.get("transaction_ids", [])),
    }
    serialized = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()
