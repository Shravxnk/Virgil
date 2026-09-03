"""PostgreSQL connection utility using asyncpg — graceful fallback when DB is unavailable."""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

_pool = None
PG_AVAILABLE = False

_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


async def init_db(host: str, port: int, database: str, user: str, password: str, database_url: str = "") -> None:
    """Initialise asyncpg connection pool and create tables. Called once at startup.

    Accepts either a full DATABASE_URL (takes priority) or individual host/port/etc vars.
    """
    global _pool, PG_AVAILABLE

    # DATABASE_URL takes priority (used when connecting to external Render DB)
    if database_url:
        dsn = database_url
    elif password:
        dsn = None  # use keyword args below
    else:
        logger.info("[Virgil] No DB credentials set — running in in-memory mock mode.")
        return

    try:
        import asyncio
        import asyncpg  # type: ignore

        pool_kwargs = dict(min_size=2, max_size=10, command_timeout=10)
        if dsn:
            # Render external DB requires SSL — use True to create a default SSL context
            pool_kwargs["ssl"] = True
            _pool = await asyncio.wait_for(
                asyncpg.create_pool(dsn=dsn, **pool_kwargs),
                timeout=10,
            )
        else:
            _pool = await asyncio.wait_for(
                asyncpg.create_pool(
                    host=host, port=port, database=database,
                    user=user, password=password, **pool_kwargs,
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
        logger.info("[Virgil] PostgreSQL connected — %s:%s/%s", host, port, database)
    except Exception as exc:
        logger.warning("[Virgil] PostgreSQL init failed (%s) — using mock data.", exc)


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
