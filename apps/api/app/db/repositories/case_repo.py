"""Case repository — reads from PostgreSQL if available, else falls back to runtime store."""

import json
from typing import Optional

from app.db import connection


async def find_cases(
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
) -> list[dict]:
    from app.db.repositories.runtime_store import list_cases as runtime_list_cases
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
        if rows:
            return [json.loads(r["data"]) for r in rows]
        # PG available but table empty (e.g. truncated) — fall back to JSON + runtime
    # No PG or PG empty — return only runtime store (generator-seeded + demo-created)
    runtime = runtime_list_cases()
    if status:
        runtime = [c for c in runtime if c.get("status") == status]
    runtime.sort(key=lambda c: c.get("risk_score", 0), reverse=True)
    return runtime[skip: skip + limit]


async def find_case_by_id(case_id: str) -> Optional[dict]:
    # Check runtime store first (covers dynamically created cases)
    from app.db.repositories.runtime_store import get_case
    runtime = get_case(case_id)
    if runtime:
        return runtime
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT data FROM cases WHERE id = $1", case_id)
        if row:
            return json.loads(row["data"])
        # PG available but row missing (e.g. table truncated) — fall back to JSON
    return None


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
            pg_count = await conn.fetchval(query, *params)
        if pg_count > 0:
            return pg_count
    # PG unavailable or empty — count runtime store
    from app.db.repositories.runtime_store import list_cases as runtime_list_cases
    runtime = runtime_list_cases()
    if status:
        runtime = [c for c in runtime if c.get("status") == status]
    return len(runtime)


async def insert_case(case: dict) -> None:
    """Persist a newly generated case to PostgreSQL (no-op if PG unavailable)."""
    from app.db.repositories.runtime_store import store_case
    store_case(case)  # always cache in-process for immediate read-back
    if not connection.PG_AVAILABLE:
        return
    pool = connection.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO cases (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
            case["id"], json.dumps(case),
        )

