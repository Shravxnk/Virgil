"""PostgreSQL connection utility using asyncpg — graceful fallback when DB is unavailable."""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

_pool = None
PG_AVAILABLE = False

_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


async def init_db(host: str, port: int, database: str, user: str, password: str) -> None:
    """Initialise asyncpg connection pool and create tables. Called once at startup."""
    global _pool, PG_AVAILABLE
    if not password:
        logger.info("[Chakravyuh] DB_PASSWORD not set — running in file-based mock mode.")
        return
    try:
        import asyncio
        import asyncpg  # type: ignore
        _pool = await asyncio.wait_for(
            asyncpg.create_pool(
                host=host,
                port=port,
                database=database,
                user=user,
                password=password,
                min_size=2,
                max_size=10,
                command_timeout=10,
            ),
            timeout=5,
        )
        # Verify connection is actually usable before marking PG as available
        async with _pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        with open(_SCHEMA_PATH, encoding="utf-8") as f:
            ddl = f.read()
        async with _pool.acquire() as conn:
            await conn.execute(ddl)
        PG_AVAILABLE = True
        logger.info("[Chakravyuh] PostgreSQL connected — %s:%s/%s", host, port, database)
    except Exception as exc:
        logger.warning("[Chakravyuh] PostgreSQL init failed (%s) — using mock data.", exc)


def get_pool():
    """Return the asyncpg connection pool (None if unavailable)."""
    return _pool


async def ping() -> bool:
    """Return True if PostgreSQL is reachable."""
    if _pool is None:
        return False
    try:
        async with _pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return True
    except Exception:
        return False
