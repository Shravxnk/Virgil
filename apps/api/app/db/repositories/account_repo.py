"""Account repository — profile lookups and behavioural baseline."""

import json
from typing import Optional

from app.core.data_loader import load_user_profiles
from app.db import connection


async def find_account(account_id: str) -> Optional[dict]:
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM accounts WHERE id = $1", account_id
            )
        if not row:
            return None
        d = dict(row)
        if d.get("profile"):
            try:
                d["profile"] = json.loads(d["profile"])
            except Exception:
                pass
        return d
    # JSON fallback
    return next((p for p in load_user_profiles() if p["account_id"] == account_id), None)


async def get_behavioural_baseline(account_id: str) -> dict:
    """Return key baseline fields needed by the risk scorer."""
    account = await find_account(account_id)
    if not account:
        return {}
    return {
        "monthly_avg_credit": account.get("monthly_avg_credit", 0),
        "monthly_avg_debit": account.get("monthly_avg_debit", 0),
        "typical_hours_start": account.get("typical_hours_start", 9),
        "typical_hours_end": account.get("typical_hours_end", 21),
        "risk_rating": account.get("risk_rating", "low"),
        "city": account.get("city"),
    }
