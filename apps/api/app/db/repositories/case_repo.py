"""Case repository — reads from PostgreSQL if available, else falls back to JSON."""

import json
from typing import Optional
from app.db import connection
from app.core.data_loader import load_cases


async def find_cases(
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
) -> list[dict]:
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        conditions, params = ["TRUE"], []
        i = 1
        if status:
            conditions.append(f"status = ${i}")
            params.append(status)
            i += 1
        params += [limit, skip]
        query = (
            f"SELECT data FROM cases "
            f"WHERE {' AND '.join(conditions)} "
            f"ORDER BY risk_score DESC "
            f"LIMIT ${i} OFFSET ${i + 1}"
        )
        async with pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
        return [json.loads(r["data"]) for r in rows]
    # JSON fallback
    cases = load_cases()
    if status:
        cases = [c for c in cases if c.get("status") == status]
    return cases[skip: skip + limit]


async def find_case_by_id(case_id: str) -> Optional[dict]:
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT data FROM cases WHERE id = $1", case_id)
        return json.loads(row["data"]) if row else None
    return next((c for c in load_cases() if c["id"] == case_id), None)


async def count_cases(status: Optional[str] = None) -> int:
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        conditions, params = ["TRUE"], []
        i = 1
        if status:
            conditions.append(f"status = ${i}")
            params.append(status)
            i += 1
        query = f"SELECT COUNT(*) FROM cases WHERE {' AND '.join(conditions)}"
        async with pool.acquire() as conn:
            return await conn.fetchval(query, *params)
    cases = load_cases()
    if status:
        cases = [c for c in cases if c.get("status") == status]
    return len(cases)

