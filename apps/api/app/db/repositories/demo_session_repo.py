"""Demo session repository — tracks the 4 GPay mock phone sessions."""

from typing import Optional
from datetime import datetime, timezone
from app.db import connection

# The 4 demo sessions seeded at startup — one per GPay phone in the presentation
DEMO_SESSION_DEFAULTS = [
    {
        "session_id": "DEMO-PHONE-1",
        "phone_label": "Phone 1 — Rajesh (Normal)",
        "account_id": "ACC-003",
        "scenario": "normal",
        "status": "idle",
    },
    {
        "session_id": "DEMO-PHONE-2",
        "phone_label": "Phone 2 — Priya (ATO)",
        "account_id": "ACC-004",
        "scenario": "ato",
        "status": "idle",
    },
    {
        "session_id": "DEMO-PHONE-3",
        "phone_label": "Phone 3 — Suyash (Structuring)",
        "account_id": "ACC-008",
        "scenario": "structuring",
        "status": "idle",
    },
    {
        "session_id": "DEMO-PHONE-4",
        "phone_label": "Phone 4 — Aditi (Mule Ring)",
        "account_id": "ACC-010",
        "scenario": "mule_network",
        "status": "idle",
    },
]


async def get_all_sessions() -> list[dict]:
    if not connection.PG_AVAILABLE:
        return DEMO_SESSION_DEFAULTS
    pool = connection.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT session_id, phone_label, account_id, scenario, status, "
            "last_txn_id, created_at, updated_at FROM demo_sessions ORDER BY session_id"
        )
    return [dict(r) for r in rows]


async def get_session(session_id: str) -> Optional[dict]:
    if not connection.PG_AVAILABLE:
        return next((s for s in DEMO_SESSION_DEFAULTS if s["session_id"] == session_id), None)
    pool = connection.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM demo_sessions WHERE session_id = $1", session_id
        )
    return dict(row) if row else None


async def update_session(
    session_id: str,
    status: str,
    last_txn_id: Optional[str] = None,
) -> None:
    if not connection.PG_AVAILABLE:
        return
    pool = connection.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE demo_sessions
               SET status = $1, last_txn_id = COALESCE($2, last_txn_id),
                   updated_at = NOW()
               WHERE session_id = $3""",
            status, last_txn_id, session_id,
        )


async def reset_all_sessions() -> None:
    """Reset all 4 demo phones to idle — call between demo runs."""
    if not connection.PG_AVAILABLE:
        return
    pool = connection.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE demo_sessions SET status = 'idle', last_txn_id = NULL, updated_at = NOW()"
        )
