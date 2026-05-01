"""Chakravyuh API — AI-Powered Fraud Intelligence System."""

import logging
import os
import sys
import traceback
from contextlib import asynccontextmanager

# Ensure project root is in path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))  # noqa: E402

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from app.api.routes import alerts, cases, compliance, dashboard, feedback, graph, reports, risk, scenarios, transactions  # noqa: E402
from app.api.routes import accounts as accounts_router  # noqa: E402
from app.api.routes import events as events_router  # noqa: E402
from app.config import get_settings  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _seed_pg_sample_data() -> None:
    """Seed both PostgreSQL and the runtime store from the dynamic data generator."""
    import json
    from datetime import datetime, timezone
    from app.db import connection
    from app.core.data_generator import generate_seed_data
    from app.core.data_loader import load_user_profiles
    from app.db.repositories.runtime_store import store_alert, store_case

    seed = generate_seed_data()
    alerts = seed["alerts"]
    cases = seed["cases"]
    txns = seed["transactions"]

    # Always populate runtime store so data is available even without PG
    for a in alerts:
        store_alert(a)
    for c in cases:
        store_case(c)

    if not connection.PG_AVAILABLE:
        print(f"[Chakravyuh] PG unavailable — seeded {len(alerts)} alerts, {len(cases)} cases into runtime store.")
        return

    pool = connection.get_pool()
    async with pool.acquire() as conn:
        # ── Ensure device_name column exists (migration safety) ───────────
        await conn.execute(
            "ALTER TABLE pre_txn_queue ADD COLUMN IF NOT EXISTS device_name TEXT"
        )

        alert_count = await conn.fetchval("SELECT COUNT(*) FROM alerts")
        case_count = await conn.fetchval("SELECT COUNT(*) FROM cases")
        txn_count = await conn.fetchval("SELECT COUNT(*) FROM transactions")
        account_count = await conn.fetchval("SELECT COUNT(*) FROM accounts")

        # ── Seed accounts from user_profiles.json ─────────────────────────
        if account_count == 0:
            profiles = load_user_profiles()
            for p in profiles:
                acc_id = p.get("account_id") or p.get("id")
                if not acc_id:
                    continue
                profile_blob = {k: v for k, v in p.items()
                                if k not in {"account_id", "id", "name", "account_type",
                                             "kyc_tier", "risk_rating", "monthly_avg_credit",
                                             "monthly_avg_debit", "typical_hours_start",
                                             "typical_hours_end", "city", "state"}}
                await conn.execute(
                    """INSERT INTO accounts
                       (id, name, account_type, kyc_tier, risk_rating,
                        monthly_avg_credit, monthly_avg_debit,
                        typical_hours_start, typical_hours_end,
                        city, state, profile)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                       ON CONFLICT (id) DO NOTHING""",
                    acc_id,
                    p.get("name", "Unknown"),
                    p.get("account_type", "individual_savings"),
                    p.get("kyc_tier"),
                    p.get("risk_rating", "low"),
                    int(p.get("monthly_avg_credit", 0)),
                    int(p.get("monthly_avg_debit", 0)),
                    int(p.get("typical_hours_start", 9)),
                    int(p.get("typical_hours_end", 21)),
                    p.get("city"),
                    p.get("state"),
                    json.dumps(profile_blob),
                )
            print(f"[Chakravyuh] Seeded {len(profiles)} accounts into PostgreSQL.")
        else:
            print(f"[Chakravyuh] PG already has {account_count} accounts.")

        if alert_count == 0:
            for a in alerts:
                await conn.execute(
                    "INSERT INTO alerts (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
                    a["id"], json.dumps(a),
                )
            print(f"[Chakravyuh] Seeded {len(alerts)} alerts into PostgreSQL.")

        if case_count == 0:
            for c in cases:
                await conn.execute(
                    "INSERT INTO cases (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
                    c["id"], json.dumps(c),
                )
            print(f"[Chakravyuh] Seeded {len(cases)} cases into PostgreSQL.")

        if txn_count == 0:
            for t in txns:
                _ts_raw = t.get("timestamp") or t.get("ts")
                try:
                    ts_val = datetime.fromisoformat(_ts_raw) if _ts_raw else datetime.now(tz=timezone.utc)
                except (ValueError, TypeError):
                    ts_val = datetime.now(tz=timezone.utc)
                await conn.execute(
                    """INSERT INTO transactions
                       (id, from_account, from_name, to_account, to_name, amount, currency,
                        txn_type, channel, status, risk_score, flagged, case_id, post_analysis, ts)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                       ON CONFLICT (id) DO NOTHING""",
                    t["id"],
                    t.get("from_account", ""),
                    t.get("from_name", ""),
                    t.get("to_account", ""),
                    t.get("to_name", ""),
                    int(t.get("amount", 0)),
                    t.get("currency", "INR"),
                    t.get("txn_type", "NEFT"),
                    t.get("channel", "netbanking"),
                    t.get("status", "completed"),
                    int(t.get("risk_score", 0)),
                    bool(t.get("flagged", False)),
                    t.get("case_id"),
                    json.dumps(t.get("post_analysis") or {}),
                    ts_val,
                )
            print(f"[Chakravyuh] Seeded {len(txns)} transactions into PostgreSQL.")

        if alert_count > 0 or case_count > 0 or txn_count > 0:
            print(f"[Chakravyuh] PG already has data: {alert_count} alerts, {case_count} cases, {txn_count} txns. Runtime store topped up.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialise MongoDB connection and seed vector collections."""
    settings = get_settings()
    # ① Always seed runtime store (works even without PostgreSQL)
    try:
        from app.core.data_generator import generate_seed_data
        from app.db.repositories.runtime_store import store_alert, store_case, store_transaction, store_profile
        _seed = generate_seed_data()
        for _a in _seed["alerts"]:
            store_alert(_a)
        for _c in _seed["cases"]:
            store_case(_c)
        for _t in _seed["transactions"]:
            store_transaction(_t)
        for _p in _seed.get("profiles", []):
            store_profile(_p)
        print(f"[Chakravyuh] Runtime store seeded: {len(_seed['alerts'])} alerts, {len(_seed['cases'])} cases, {len(_seed['transactions'])} txns, {len(_seed.get('profiles', []))} profiles.")
    except Exception as _e:
        print(f"[Chakravyuh] Runtime store seeding failed: {_e}")
    # ② PostgreSQL (optional — failures do not affect runtime store)
    try:
        from app.db.connection import init_db
        await init_db(
            settings.db_host, settings.db_port, settings.db_name,
            settings.db_user, settings.db_password,
            database_url=settings.database_url,
        )
        await _seed_pg_sample_data()
    except Exception as e:
        print(f"[Chakravyuh] PostgreSQL init skipped: {e}")
    # Clear JSON cache so data files are always read fresh after startup
    try:
        from app.core.data_loader import clear_all_caches
        clear_all_caches()
    except Exception:
        pass
    # Vector store (ChromaDB — optional, seeded in a daemon thread so it never blocks startup)
    import threading
    def _seed_bg():
        try:
            from app.retrieval.vector_store import seed_all_collections
            seed_all_collections()
            print("[Chakravyuh] Vector store seeding complete.")
        except Exception as e:
            print(f"[Chakravyuh] Vector store seeding skipped: {e}")
    t = threading.Thread(target=_seed_bg, daemon=True)
    t.start()
    yield


settings = get_settings()

app = FastAPI(
    title="Chakravyuh API",
    description="AI-Powered Fraud Intelligence System for Banking",
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error("Unhandled exception on %s %s:\n%s", request.method, request.url.path, tb)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc), "type": type(exc).__name__},
    )

# Register route modules
app.include_router(risk.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(cases.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(scenarios.router, prefix="/api")
app.include_router(compliance.router, prefix="/api")
app.include_router(accounts_router.router, prefix="/api")
app.include_router(events_router.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "chakravyuh-api",
        "version": settings.app_version,
    }


@app.get("/api/debug")
async def debug_info():
    """Diagnostic endpoint — exposes config, DB status, and data counts for troubleshooting."""
    from app.db import connection
    from app.db.repositories.runtime_store import list_alerts, list_cases, list_transactions
    from app.config import get_settings

    cfg = get_settings()
    data_dir_exists = os.path.isdir(cfg.data_dir)
    sample_dir = os.path.join(cfg.data_dir, "sample")
    sample_files = os.listdir(sample_dir) if os.path.isdir(sample_dir) else []

    pg_ok = False
    if connection.PG_AVAILABLE and connection.get_pool():
        try:
            async with connection.get_pool().acquire() as conn:
                pg_ok = bool(await conn.fetchval("SELECT 1"))
        except Exception:
            pg_ok = False

    return {
        "pg_available": connection.PG_AVAILABLE,
        "pg_ping": pg_ok,
        "database_url_set": bool(cfg.database_url),
        "data_dir": cfg.data_dir,
        "data_dir_exists": data_dir_exists,
        "sample_files": sample_files,
        "runtime_alerts": len(list_alerts()),
        "runtime_cases": len(list_cases()),
        "runtime_transactions": len(list_transactions()),
    }


@app.get("/api")
async def api_root():
    return {
        "service": "Chakravyuh Fraud Intelligence API",
        "version": settings.app_version,
        "endpoints": {
            "risk_scoring": "/api/risk/score?transaction_id={id}",
            "alerts": "/api/alerts",
            "cases": "/api/cases",
            "graph": "/api/graph/{case_id}",
            "report": "/api/report/{case_id}/pdf",
            "analyst_dashboard": "/api/dashboard/analyst",
            "executive_dashboard": "/api/dashboard/executive",
            "feedback": "/api/feedback/confirm",
            "knowledge": "/api/knowledge/search",
        },
    }
