"""Alert repository — reads from PostgreSQL if available, else falls back to runtime store."""

import json
from typing import Optional

from app.db import connection


async def find_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
) -> list[dict]:
    from app.db.repositories.runtime_store import list_alerts as runtime_list_alerts
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        conditions, params = ["TRUE"], []
        i = 1
        if severity:
            conditions.append(f"severity = ${i}")
            params.append(severity)
            i += 1
        if status:
            conditions.append(f"status = ${i}")
            params.append(status)
            i += 1
        params += [limit, skip]
        query = (
            f"SELECT data FROM alerts "
            f"WHERE {' AND '.join(conditions)} "
            f"ORDER BY created_at DESC "
            f"LIMIT ${i} OFFSET ${i + 1}"
        )
        async with pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
        if rows:
            return [json.loads(r["data"]) for r in rows]
        # PG available but table empty (e.g. truncated) — fall back to JSON + runtime
    # No PG or PG empty — return only runtime store (generator-seeded + demo-created)
    runtime = runtime_list_alerts()
    if severity:
        runtime = [a for a in runtime if a.get("severity") == severity]
    if status:
        runtime = [a for a in runtime if a.get("status") == status]
    runtime.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
    return runtime[skip: skip + limit]


async def find_alert_by_id(alert_id: str) -> Optional[dict]:
    # Check runtime store first (covers dynamically created alerts)
    from app.db.repositories.runtime_store import get_alert
    runtime = get_alert(alert_id)
    if runtime:
        return runtime
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT data FROM alerts WHERE id = $1", alert_id)
        if row:
            return json.loads(row["data"])
        # PG available but row missing (e.g. table truncated) — fall back to JSON
    return None


async def count_alerts(severity: Optional[str] = None, status: Optional[str] = None) -> int:
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        conditions, params = ["TRUE"], []
        i = 1
        if severity:
            conditions.append(f"severity = ${i}")
            params.append(severity)
            i += 1
        if status:
            conditions.append(f"status = ${i}")
            params.append(status)
            i += 1
        query = f"SELECT COUNT(*) FROM alerts WHERE {' AND '.join(conditions)}"
        async with pool.acquire() as conn:
            pg_count = await conn.fetchval(query, *params)
        if pg_count > 0:
            return pg_count
    # PG unavailable or empty — count runtime store
    from app.db.repositories.runtime_store import list_alerts as runtime_list_alerts
    runtime = runtime_list_alerts()
    if severity:
        runtime = [a for a in runtime if a.get("severity") == severity]
    if status:
        runtime = [a for a in runtime if a.get("status") == status]
    return len(runtime)


async def insert_alert(alert: dict) -> None:
    """Persist a newly generated alert to PostgreSQL (no-op if PG unavailable)."""
    from app.db.repositories.runtime_store import store_alert
    store_alert(alert)  # always cache in-process for immediate read-back
    if not connection.PG_AVAILABLE:
        return
    pool = connection.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO alerts (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
            alert["id"], json.dumps(alert),
        )

