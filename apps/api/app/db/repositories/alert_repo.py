"""Alert repository — reads from PostgreSQL if available, else falls back to JSON."""

import json
from typing import Optional
from app.db import connection
from app.core.data_loader import load_alerts


async def find_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
) -> list[dict]:
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
        return [json.loads(r["data"]) for r in rows]
    # JSON fallback
    alerts = load_alerts()
    if severity:
        alerts = [a for a in alerts if a.get("severity") == severity]
    if status:
        alerts = [a for a in alerts if a.get("status") == status]
    return alerts[skip: skip + limit]


async def find_alert_by_id(alert_id: str) -> Optional[dict]:
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT data FROM alerts WHERE id = $1", alert_id)
        return json.loads(row["data"]) if row else None
    return next((a for a in load_alerts() if a["id"] == alert_id), None)


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
            return await conn.fetchval(query, *params)
    alerts = load_alerts()
    if severity:
        alerts = [a for a in alerts if a.get("severity") == severity]
    if status:
        alerts = [a for a in alerts if a.get("status") == status]
    return len(alerts)

