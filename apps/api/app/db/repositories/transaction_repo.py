"""Transaction repository — pre-transaction queue + completed transactions."""

import json
import uuid
from datetime import datetime, timezone
from typing import Optional
from app.db import connection
from app.core.data_loader import load_transactions


# ---------------------------------------------------------------------------
# Completed transactions
# ---------------------------------------------------------------------------

async def find_transactions(
    flagged: Optional[bool] = None,
    limit: int = 50,
    skip: int = 0,
) -> list[dict]:
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        conditions, params = ["TRUE"], []
        i = 1
        if flagged is not None:
            conditions.append(f"flagged = ${i}")
            params.append(flagged)
            i += 1
        params += [limit, skip]
        query = (
            f"SELECT id, from_account, from_name, to_account, to_name, amount, "
            f"currency, txn_type, channel, status, risk_score, flagged, "
            f"pre_txn_id, case_id, post_analysis, ts, created_at "
            f"FROM transactions "
            f"WHERE {' AND '.join(conditions)} "
            f"ORDER BY ts DESC "
            f"LIMIT ${i} OFFSET ${i + 1}"
        )
        async with pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
        return [_txn_row_to_dict(r) for r in rows]
    txns = load_transactions()
    if flagged is not None:
        txns = [t for t in txns if t.get("flagged") == flagged]
    return txns[skip: skip + limit]


async def find_transaction_by_id(txn_id: str) -> Optional[dict]:
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        query = (
            "SELECT id, from_account, from_name, to_account, to_name, amount, "
            "currency, txn_type, channel, status, risk_score, flagged, "
            "pre_txn_id, case_id, post_analysis, ts, created_at "
            "FROM transactions WHERE id = $1"
        )
        async with pool.acquire() as conn:
            row = await conn.fetchrow(query, txn_id)
        return _txn_row_to_dict(row) if row else None
    return next((t for t in load_transactions() if t["id"] == txn_id), None)


async def count_transactions(flagged: Optional[bool] = None) -> int:
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        if flagged is not None:
            async with pool.acquire() as conn:
                return await conn.fetchval("SELECT COUNT(*) FROM transactions WHERE flagged = $1", flagged)
        async with pool.acquire() as conn:
            return await conn.fetchval("SELECT COUNT(*) FROM transactions")
    txns = load_transactions()
    if flagged is not None:
        txns = [t for t in txns if t.get("flagged") == flagged]
    return len(txns)


# ---------------------------------------------------------------------------
# Pre-transaction queue  (real-time GPay mock scoring)
# ---------------------------------------------------------------------------

async def submit_pre_txn(
    from_account: str,
    to_account: str,
    amount: int,
    txn_type: str,
    channel: str,
    device_id: Optional[str] = None,
    device_known: bool = False,
    ip_address: Optional[str] = None,
    geo_location: Optional[str] = None,
    upi_ref: Optional[str] = None,
    currency: str = "INR",
) -> str:
    """Insert a pending transaction.  Returns the generated pre_txn id."""
    pre_id = f"PRE-{uuid.uuid4().hex[:8].upper()}"
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO pre_txn_queue
                   (id, from_account, to_account, amount, currency, txn_type,
                    channel, device_id, device_known, ip_address, geo_location, upi_ref)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)""",
                pre_id, from_account, to_account, amount, currency, txn_type,
                channel, device_id, device_known, ip_address, geo_location, upi_ref,
            )
    return pre_id


async def score_pre_txn(
    pre_id: str,
    risk_score: int,
    decision: str,
    risk_signals: dict,
) -> None:
    """Update a pre-txn record with the ML decision."""
    if not connection.PG_AVAILABLE:
        return
    pool = connection.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE pre_txn_queue
               SET risk_score = $1, decision = $2,
                   risk_signals = $3::jsonb, scored_at = NOW()
               WHERE id = $4""",
            risk_score, decision, json.dumps(risk_signals), pre_id,
        )


async def complete_pre_txn(pre_id: str) -> None:
    """Mark a pre-txn entry as completed (transaction executed)."""
    if not connection.PG_AVAILABLE:
        return
    pool = connection.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE pre_txn_queue SET completed = TRUE WHERE id = $1", pre_id
        )


async def get_pre_txn(pre_id: str) -> Optional[dict]:
    if not connection.PG_AVAILABLE:
        return None
    pool = connection.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM pre_txn_queue WHERE id = $1", pre_id
        )
    return _pre_txn_row_to_dict(row) if row else None


async def get_manual_review_queue(limit: int = 50) -> list[dict]:
    """Return all pre-transactions that were scored as manual_review and not yet resolved."""
    if not connection.PG_AVAILABLE:
        return []
    pool = connection.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM pre_txn_queue
               WHERE decision = 'manual_review'
               AND completed = FALSE
               ORDER BY created_at DESC
               LIMIT $1""",
            limit,
        )
    return [_pre_txn_row_to_dict(r) for r in rows]


async def resolve_manual_review(pre_id: str, analyst_decision: str, analyst_note: str = "") -> bool:
    """Analyst approves or rejects a manual_review transaction.
    analyst_decision: 'approved' | 'rejected'
    Returns True if record was updated."""
    if not connection.PG_AVAILABLE:
        return False
    pool = connection.get_pool()
    # completed=TRUE means resolved (either way), decision updated to analyst outcome
    async with pool.acquire() as conn:
        result = await conn.execute(
            """UPDATE pre_txn_queue
               SET completed = TRUE,
                   decision = $1,
                   risk_signals = risk_signals || $2::jsonb
               WHERE id = $3 AND decision = 'manual_review' AND completed = FALSE""",
            analyst_decision,
            json.dumps({"analyst_note": analyst_note, "resolved_at": datetime.now(timezone.utc).isoformat()}),
            pre_id,
        )
    return result == "UPDATE 1"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _txn_row_to_dict(row) -> dict:
    d = dict(row)
    if d.get("post_analysis"):
        try:
            d["post_analysis"] = json.loads(d["post_analysis"])
        except Exception:
            pass
    # Normalise timestamp to ISO string
    for key in ("ts", "created_at", "scored_at"):
        if key in d and d[key] is not None and hasattr(d[key], "isoformat"):
            d[key] = d[key].isoformat()
    return d


def _pre_txn_row_to_dict(row) -> dict:
    d = dict(row)
    if d.get("risk_signals"):
        try:
            if isinstance(d["risk_signals"], str):
                d["risk_signals"] = json.loads(d["risk_signals"])
        except Exception:
            pass
    for key in ("created_at", "scored_at"):
        if key in d and d[key] is not None and hasattr(d[key], "isoformat"):
            d[key] = d[key].isoformat()
    return d
