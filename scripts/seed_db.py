#!/usr/bin/env python3
"""
Seed PostgreSQL with Indian fraud intelligence sample data.

Usage:
    python scripts/seed_db.py

Requires DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", "5432"))
DB_NAME     = os.getenv("DB_NAME", "postgres")
DB_USER     = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DATA_DIR    = os.path.join(os.path.dirname(__file__), "..", "data", "sample")


def _load(filename: str):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _parse_ts(ts_str: str | None):
    """Parse an ISO 8601 timestamp string into a timezone-aware datetime."""
    if not ts_str:
        return None
    return datetime.fromisoformat(ts_str)


async def seed():
    if not DB_PASSWORD:
        print("ERROR: DB_PASSWORD not set in .env")
        sys.exit(1)

    import asyncpg
    print(f"Connecting to PostgreSQL at {DB_HOST}:{DB_PORT}/{DB_NAME} …")
    conn = await asyncpg.connect(
        host=DB_HOST, port=DB_PORT, database=DB_NAME,
        user=DB_USER, password=DB_PASSWORD,
    )

    # Create tables (idempotent)
    ddl = open(
        os.path.join(os.path.dirname(__file__), "..", "apps", "api", "app", "db", "schema.sql"),
        encoding="utf-8",
    ).read()
    await conn.execute(ddl)
    print("  schema       : tables ready")

    # -----------------------------------------------------------------------
    # Accounts (from user_profiles.json)
    # -----------------------------------------------------------------------
    profiles = _load("user_profiles.json") or []
    await conn.execute("TRUNCATE accounts CASCADE")
    for p in profiles:
        await conn.execute(
            """INSERT INTO accounts
               (id, name, account_type, kyc_tier, risk_rating,
                monthly_avg_credit, monthly_avg_debit,
                typical_hours_start, typical_hours_end,
                city, state, profile)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
               ON CONFLICT (id) DO NOTHING""",
            p["account_id"], p["name"], p["account_type"],
            p.get("kyc_tier"), p.get("risk_rating", "low"),
            p.get("monthly_avg_credit", 0), p.get("monthly_avg_debit", 0),
            9, 21,
            p.get("city"), p.get("state"),
            json.dumps(p),
        )
    print(f"  accounts     : {len(profiles)} rows")

    # -----------------------------------------------------------------------
    # Alerts
    # -----------------------------------------------------------------------
    alerts = _load("alerts.json") or []
    await conn.execute("TRUNCATE alerts CASCADE")
    for a in alerts:
        await conn.execute(
            "INSERT INTO alerts (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING",
            a["id"], json.dumps(a),
        )
    print(f"  alerts       : {len(alerts)} rows")

    # -----------------------------------------------------------------------
    # Cases
    # -----------------------------------------------------------------------
    cases = _load("cases.json") or []
    await conn.execute("TRUNCATE cases CASCADE")
    for c in cases:
        await conn.execute(
            "INSERT INTO cases (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING",
            c["id"], json.dumps(c),
        )
    print(f"  cases        : {len(cases)} rows")

    # -----------------------------------------------------------------------
    # Transactions (with proper column mapping)
    # -----------------------------------------------------------------------
    txns = _load("transactions.json") or []
    await conn.execute("TRUNCATE transactions CASCADE")
    for t in txns:
        # JSON uses "type" and "timestamp"; DB schema uses "txn_type" and "ts"
        await conn.execute(
            """INSERT INTO transactions
               (id, from_account, from_name, to_account, to_name,
                amount, currency, txn_type, channel,
                status, risk_score, flagged, case_id, post_analysis, ts)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::timestamptz)
               ON CONFLICT (id) DO NOTHING""",
            t["id"],
            t.get("from_account", ""), t.get("from_name"),
            t.get("to_account", ""), t.get("to_name"),
            int(t.get("amount", 0)), t.get("currency", "INR"),
            t.get("type", t.get("txn_type", "NEFT")),
            t.get("channel", "netbanking"),
            t.get("status", "completed"),
            int(t.get("risk_score", 0)), bool(t.get("flagged", False)),
            t.get("case_id"),
            json.dumps(t.get("post_analysis", {})),
            _parse_ts(t.get("timestamp", t.get("ts"))),
        )
    print(f"  transactions : {len(txns)} rows")

    # -----------------------------------------------------------------------
    # Demo sessions (4 GPay mock phones)
    # -----------------------------------------------------------------------
    await conn.execute("TRUNCATE demo_sessions CASCADE")
    demo_phones = [
        ("DEMO-PHONE-1", "Phone 1 — Rajesh (Normal)",         "ACC-003", "normal"),
        ("DEMO-PHONE-2", "Phone 2 — Priya (ATO)",             "ACC-004", "ato"),
        ("DEMO-PHONE-3", "Phone 3 — Suyash (Structuring)",    "ACC-008", "structuring"),
        ("DEMO-PHONE-4", "Phone 4 — Aditi (Mule Ring)",       "ACC-010", "mule_network"),
    ]
    for sid, label, acc, scenario in demo_phones:
        await conn.execute(
            """INSERT INTO demo_sessions (session_id, phone_label, account_id, scenario)
               VALUES ($1,$2,$3,$4) ON CONFLICT (session_id) DO NOTHING""",
            sid, label, acc, scenario,
        )
    print(f"  demo_sessions: {len(demo_phones)} rows")

    await conn.close()
    print("\nPostgreSQL seed complete!")


if __name__ == "__main__":
    asyncio.run(seed())

