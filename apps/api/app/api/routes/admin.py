"""Admin / DBM routes — create, delete, and manage accounts and DB state.
Exposed at /api/admin/* for the /dbm dashboard.
"""

import json
import random
import string
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import connection

router = APIRouter(prefix="/admin", tags=["Admin / DB Manager"])

# ── helpers ──────────────────────────────────────────────────────────────────

def _uid(prefix: str = "ACC") -> str:
    """Generate a short random ID like ACC-A3F7B2."""
    return f"{prefix}-{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"


def _now() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


# ── schemas ───────────────────────────────────────────────────────────────────

class CreateAccountRequest(BaseModel):
    id: Optional[str] = None          # auto-generated if not supplied
    name: str
    account_type: str = "individual_savings"
    kyc_tier: str = "KYC2"
    risk_rating: str = "low"
    monthly_avg_credit: int = 500000
    monthly_avg_debit: int = 400000
    typical_hours_start: int = 9
    typical_hours_end: int = 18
    city: str = "Mumbai"
    state: str = "Maharashtra"
    upi_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class UpdateAccountRequest(BaseModel):
    name: Optional[str] = None
    account_type: Optional[str] = None
    kyc_tier: Optional[str] = None
    risk_rating: Optional[str] = None
    monthly_avg_credit: Optional[int] = None
    monthly_avg_debit: Optional[int] = None
    typical_hours_start: Optional[int] = None
    typical_hours_end: Optional[int] = None
    city: Optional[str] = None
    state: Optional[str] = None
    upi_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


# ── db stats ──────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_db_stats():
    """Return row counts for every table — used for the DBM overview card."""
    if not connection.PG_AVAILABLE:
        return {"pg": False, "stats": {}}

    pool = connection.get_pool()
    async with pool.acquire() as conn:
        tables = ["accounts", "pre_txn_queue", "transactions", "alerts", "cases", "demo_sessions"]
        stats = {}
        for t in tables:
            try:
                row = await conn.fetchrow(f"SELECT COUNT(*) AS n FROM {t}")  # noqa: S608
                stats[t] = row["n"]
            except Exception:
                stats[t] = 0
    return {"pg": True, "stats": stats}


# ── account CRUD ──────────────────────────────────────────────────────────────

@router.get("/accounts")
async def list_accounts_admin():
    """Full account list with all columns for the DBM table."""
    if not connection.PG_AVAILABLE:
        raise HTTPException(status_code=503, detail="PostgreSQL not available")

    pool = connection.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, account_type, kyc_tier, risk_rating, "
            "monthly_avg_credit, monthly_avg_debit, "
            "typical_hours_start, typical_hours_end, "
            "city, state, profile "
            "FROM accounts ORDER BY id"
        )

    accounts = []
    for r in rows:
        profile = {}
        if r["profile"]:
            try:
                profile = json.loads(r["profile"]) if isinstance(r["profile"], str) else r["profile"]
            except Exception:
                pass
        accounts.append({
            "id": r["id"],
            "name": r["name"],
            "account_type": r["account_type"],
            "kyc_tier": r["kyc_tier"],
            "risk_rating": r["risk_rating"],
            "monthly_avg_credit": r["monthly_avg_credit"],
            "monthly_avg_debit": r["monthly_avg_debit"],
            "typical_hours_start": r["typical_hours_start"],
            "typical_hours_end": r["typical_hours_end"],
            "city": r["city"],
            "state": r["state"],
            "upi_id": profile.get("upi_id", ""),
            "phone": profile.get("phone", ""),
            "email": profile.get("email", ""),
            "notes": profile.get("notes", ""),
            "created_at": profile.get("created_at", ""),
        })
    return {"accounts": accounts, "total": len(accounts)}


@router.post("/accounts", status_code=201)
async def create_account(req: CreateAccountRequest):
    """Create a new account. ID is auto-generated if not provided."""
    if not connection.PG_AVAILABLE:
        raise HTTPException(status_code=503, detail="PostgreSQL not available")

    account_id = req.id or _uid("ACC")
    profile = {
        "upi_id": req.upi_id or f"{account_id.lower().replace('-', '')}@upi",
        "phone": req.phone or "",
        "email": req.email or "",
        "notes": req.notes or "",
        "created_at": _now(),
    }

    pool = connection.get_pool()
    async with pool.acquire() as conn:
        # check duplicate
        existing = await conn.fetchrow("SELECT id FROM accounts WHERE id = $1", account_id)
        if existing:
            raise HTTPException(status_code=409, detail=f"Account '{account_id}' already exists")

        await conn.execute(
            """INSERT INTO accounts
               (id, name, account_type, kyc_tier, risk_rating,
                monthly_avg_credit, monthly_avg_debit,
                typical_hours_start, typical_hours_end,
                city, state, profile)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)""",
            account_id, req.name, req.account_type, req.kyc_tier, req.risk_rating,
            req.monthly_avg_credit, req.monthly_avg_debit,
            req.typical_hours_start, req.typical_hours_end,
            req.city, req.state, json.dumps(profile),
        )

    return {
        "id": account_id,
        "name": req.name,
        "account_type": req.account_type,
        "risk_rating": req.risk_rating,
        "city": req.city,
        "upi_id": profile["upi_id"],
        "created_at": profile["created_at"],
        "message": f"Account '{account_id}' created successfully",
    }


@router.put("/accounts/{account_id}")
async def update_account(account_id: str, req: UpdateAccountRequest):
    """Update an existing account's fields."""
    if not connection.PG_AVAILABLE:
        raise HTTPException(status_code=503, detail="PostgreSQL not available")

    pool = connection.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM accounts WHERE id = $1", account_id)
        if not row:
            raise HTTPException(status_code=404, detail=f"Account '{account_id}' not found")

        # build update dict — only supplied fields
        updates: dict = {}
        for field in ["name", "account_type", "kyc_tier", "risk_rating",
                      "monthly_avg_credit", "monthly_avg_debit",
                      "typical_hours_start", "typical_hours_end", "city", "state"]:
            val = getattr(req, field, None)
            if val is not None:
                updates[field] = val

        # update profile JSONB
        profile = {}
        if row["profile"]:
            try:
                profile = json.loads(row["profile"]) if isinstance(row["profile"], str) else dict(row["profile"])
            except Exception:
                pass
        for key in ["upi_id", "phone", "email", "notes"]:
            val = getattr(req, key, None)
            if val is not None:
                profile[key] = val
        profile["updated_at"] = _now()

        if updates:
            set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates.keys()))
            values = list(updates.values())
            await conn.execute(
                f"UPDATE accounts SET {set_clause} WHERE id = $1",  # noqa: S608
                account_id, *values,
            )

        await conn.execute(
            "UPDATE accounts SET profile = $1 WHERE id = $2",
            json.dumps(profile), account_id,
        )

    return {"message": f"Account '{account_id}' updated", "id": account_id}


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    """Delete a single account by ID."""
    if not connection.PG_AVAILABLE:
        raise HTTPException(status_code=503, detail="PostgreSQL not available")

    pool = connection.get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM accounts WHERE id = $1", account_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail=f"Account '{account_id}' not found")

    return {"message": f"Account '{account_id}' deleted", "id": account_id}


@router.delete("/accounts")
async def delete_all_accounts():
    """Delete ALL accounts from DB. Dangerous — confirms via API."""
    if not connection.PG_AVAILABLE:
        raise HTTPException(status_code=503, detail="PostgreSQL not available")

    pool = connection.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT COUNT(*) AS n FROM accounts")
        count = row["n"]
        await conn.execute("TRUNCATE accounts CASCADE")

    return {"message": f"Deleted all {count} accounts (TRUNCATE accounts CASCADE)", "deleted": count}


# ── table truncate ────────────────────────────────────────────────────────────

@router.delete("/table/{table_name}")
async def truncate_table(table_name: str):
    """Truncate a specific table. Allowed: accounts, pre_txn_queue, transactions, alerts, cases."""
    allowed = {"accounts", "pre_txn_queue", "transactions", "alerts", "cases", "demo_sessions"}
    if table_name not in allowed:
        raise HTTPException(status_code=400, detail=f"Table '{table_name}' not in allowed list: {allowed}")

    if not connection.PG_AVAILABLE:
        raise HTTPException(status_code=503, detail="PostgreSQL not available")

    pool = connection.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(f"SELECT COUNT(*) AS n FROM {table_name}")  # noqa: S608
        count = row["n"]
        await conn.execute(f"TRUNCATE {table_name} CASCADE")  # noqa: S608

    return {"message": f"Truncated table '{table_name}' ({count} rows deleted)", "table": table_name, "deleted": count}


@router.delete("/all")
async def truncate_all_tables():
    """Truncate ALL tables in the correct dependency order."""
    if not connection.PG_AVAILABLE:
        raise HTTPException(status_code=503, detail="PostgreSQL not available")

    tables = ["demo_sessions", "cases", "alerts", "pre_txn_queue", "transactions", "accounts"]
    pool = connection.get_pool()
    results = {}
    async with pool.acquire() as conn:
        for t in tables:
            try:
                row = await conn.fetchrow(f"SELECT COUNT(*) AS n FROM {t}")  # noqa: S608
                results[t] = row["n"]
                await conn.execute(f"TRUNCATE {t} CASCADE")  # noqa: S608
            except Exception as e:
                results[t] = f"error: {e}"

    return {"message": "All tables truncated", "deleted": results}


# ── seed endpoint ─────────────────────────────────────────────────────────────

@router.post("/seed")
async def seed_default_data():
    """Re-seed the DB with the default 40 bifurcated test accounts + patterns."""
    if not connection.PG_AVAILABLE:
        raise HTTPException(status_code=503, detail="PostgreSQL not available")

    try:
        from app.core.data_generator import generate_seed_data
        data = generate_seed_data()
        profiles = data.get("user_profiles", [])
        pool = connection.get_pool()
        async with pool.acquire() as conn:
            # clear existing
            await conn.execute("TRUNCATE accounts CASCADE")
            seeded = 0
            for p in profiles:
                acc_id = p.get("account_id", "")
                if not acc_id:
                    continue
                profile_blob = {k: v for k, v in p.items() if k not in (
                    "account_id", "name", "account_type", "kyc_tier", "risk_rating",
                    "monthly_avg_credit", "monthly_avg_debit",
                    "typical_hours_start", "typical_hours_end", "city", "state",
                )}
                await conn.execute(
                    """INSERT INTO accounts
                       (id, name, account_type, kyc_tier, risk_rating,
                        monthly_avg_credit, monthly_avg_debit,
                        typical_hours_start, typical_hours_end,
                        city, state, profile)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                       ON CONFLICT (id) DO NOTHING""",
                    acc_id, p.get("name", ""), p.get("account_type", "individual_savings"),
                    p.get("kyc_tier", "KYC2"), p.get("risk_rating", "low"),
                    p.get("monthly_avg_credit", 500000), p.get("monthly_avg_debit", 400000),
                    p.get("typical_hours_start", 9), p.get("typical_hours_end", 18),
                    p.get("city", ""), p.get("state", ""), json.dumps(profile_blob),
                )
                seeded += 1
        return {"message": f"Seeded {seeded} accounts from default generator", "seeded": seeded}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
