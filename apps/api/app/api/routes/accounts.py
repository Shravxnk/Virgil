"""Accounts route — list and look up bank accounts seeded into the system."""

import json

from fastapi import APIRouter, HTTPException

from app.db import connection
from app.db.repositories.account_repo import find_account
from app.core.data_loader import load_user_profiles

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get("")
async def list_accounts():
    """Return all accounts available in the system (used by GPay mock dropdown)."""
    if connection.PG_AVAILABLE:
        pool = connection.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, name, account_type, kyc_tier, risk_rating, city, state, profile "
                "FROM accounts ORDER BY id"
            )
        if rows:
            accounts = []
            for r in rows:
                profile = {}
                if r["profile"]:
                    try:
                        profile = json.loads(r["profile"])
                    except Exception:
                        pass
                accounts.append({
                    "id": r["id"],
                    "name": r["name"],
                    "account_type": r["account_type"],
                    "kyc_tier": r["kyc_tier"],
                    "risk_rating": r["risk_rating"],
                    "city": r["city"],
                    "state": r["state"],
                    "upi_id": profile.get("upi_id", ""),
                    "phone": profile.get("phone", ""),
                })
            return {"accounts": accounts, "total": len(accounts)}

    # Fallback — load from JSON profiles
    profiles = load_user_profiles()
    accounts = [
        {
            "id": p.get("account_id", ""),
            "name": p.get("name", ""),
            "account_type": p.get("account_type", ""),
            "kyc_tier": p.get("kyc_tier", ""),
            "risk_rating": p.get("risk_rating", "low"),
            "city": p.get("city", ""),
            "state": p.get("state", ""),
            "upi_id": p.get("upi_id", ""),
            "phone": p.get("phone", ""),
        }
        for p in profiles
        if p.get("account_id")
    ]
    return {"accounts": accounts, "total": len(accounts)}


@router.get("/{account_id}")
async def get_account(account_id: str):
    """Look up a single account by ID."""
    account = await find_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail=f"Account '{account_id}' not found.")
    return account
