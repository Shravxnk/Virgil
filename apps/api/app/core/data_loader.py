"""Data loader: loads sample data from JSON files into memory."""

import json
import os
import re
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any

from app.config import get_settings

# ---------------------------------------------------------------------------
# Dynamic timestamp normalisation
# Shifts all ISO timestamps in loaded records so the most-recent one appears
# ~2 days ago from today — keeps demo data always feeling "current".
# ---------------------------------------------------------------------------

_TS_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")


def _normalize_timestamps(records: list) -> list:
    """Return a copy of *records* with all ISO timestamps shifted to be recent."""
    max_dt: datetime | None = None

    def _scan(obj: Any) -> None:
        nonlocal max_dt
        if isinstance(obj, str) and _TS_RE.match(obj):
            try:
                dt = datetime.fromisoformat(obj)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if max_dt is None or dt > max_dt:
                    max_dt = dt
            except (ValueError, OverflowError):
                pass
        elif isinstance(obj, dict):
            for v in obj.values():
                _scan(v)
        elif isinstance(obj, list):
            for item in obj:
                _scan(item)

    for r in records:
        _scan(r)

    if max_dt is None:
        return records

    # Anchor: most-recent record should appear 2 days ago
    target = datetime.now(tz=max_dt.tzinfo) - timedelta(days=2)
    offset = target - max_dt

    # Only apply forward shift when data is actually stale (no backward shifts)
    if offset.total_seconds() <= 0:
        return records

    def _shift(obj: Any) -> Any:
        if isinstance(obj, str) and _TS_RE.match(obj):
            try:
                return (datetime.fromisoformat(obj) + offset).isoformat()
            except (ValueError, OverflowError):
                return obj
        if isinstance(obj, dict):
            return {k: _shift(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_shift(item) for item in obj]
        return obj

    return [_shift(r) for r in records]


def _load_json(filename: str) -> Any:
    settings = get_settings()
    filepath = os.path.join(settings.data_dir, "sample", filename)
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_doc(filename: str) -> str:
    settings = get_settings()
    filepath = os.path.join(settings.data_dir, "docs", filename)
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def clear_all_caches() -> None:
    """Clear all lru_cache caches so data is reloaded fresh on next access."""
    load_alerts.cache_clear()
    load_cases.cache_clear()
    load_transactions.cache_clear()
    load_user_profiles.cache_clear()
    load_devices.cache_clear()
    load_executive_metrics.cache_clear()


@lru_cache()
def load_alerts() -> list[dict]:
    return _normalize_timestamps(_load_json("alerts.json"))


@lru_cache()
def load_cases() -> list[dict]:
    return _normalize_timestamps(_load_json("cases.json"))


@lru_cache()
def load_transactions() -> list[dict]:
    return _normalize_timestamps(_load_json("transactions.json"))


@lru_cache()
def load_user_profiles() -> list[dict]:
    return _load_json("user_profiles.json")


@lru_cache()
def load_devices() -> list[dict]:
    return _load_json("devices.json")


@lru_cache()
def load_executive_metrics() -> dict:
    return _load_json("executive_metrics.json")


@lru_cache()
def load_fraud_kb() -> str:
    return _load_doc("fraud_knowledge_base.md")


@lru_cache()
def load_policy_playbook() -> str:
    return _load_doc("policy_playbook.md")


@lru_cache()
def load_reporting_templates() -> str:
    return _load_doc("reporting_templates.md")


def _generate_profile_fallback(account_id: str) -> dict:
    """Deterministic fallback profile for unknown accounts — no API call needed."""
    import hashlib
    h = int(hashlib.md5(account_id.encode()).hexdigest(), 16)
    account_types = ["individual_savings", "individual_current", "corporate_current", "individual_savings"]
    cities = ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad", "Chennai", "Ahmedabad", "Kolkata"]
    banks = ["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Mahindra Bank"]
    names = ["Rahul Sharma", "Priya Singh", "Amit Kumar", "Neha Gupta", "Vikram Nair",
             "Ananya Das", "Suresh Patel", "Kavya Reddy", "Rohan Mehta", "Divya Iyer"]
    acc_type = account_types[h % 4]
    is_corp = "corporate" in acc_type
    monthly_avg = (h % 40 + 5) * (100_000 if is_corp else 10_000)
    return {
        "account_id": account_id,
        "account_number": str(h)[:11],
        "name": f"Corp-{account_id}" if is_corp else names[h % len(names)],
        "bank_name": banks[h % len(banks)],
        "ifsc": f"HDFC{str(h)[:7]}",
        "account_type": acc_type,
        "kyc_tier": "C1" if is_corp else "I1",
        "risk_rating": "low",
        "monthly_avg_credit": monthly_avg,
        "monthly_avg_debit": int(monthly_avg * 0.9),
        "typical_hours_start": 9,
        "typical_hours_end": 18 if is_corp else 21,
        "city": cities[h % len(cities)],
        "state": "Maharashtra",
        "usual_counterparties": [],
        "flags": [],
        "_generated": True,
        "_source": "fallback",
    }


def _generate_profile_with_openai(account_id: str) -> dict | None:
    """Call OpenAI to generate a realistic Indian bank account profile. Returns None if unavailable."""
    import json as _json
    from app.llm.openai_client import chat_completion

    system = (
        "You are a banking data generator for an Indian AML fraud detection platform. "
        "Return ONLY a valid JSON object — no explanation, no markdown fences."
    )
    user = (
        f"Generate a realistic Indian bank account profile for account_id '{account_id}'. "
        "Use this exact schema (all fields required):\n"
        "{\n"
        '  "account_id": "<same as input>",\n'
        '  "account_number": "<11-digit number>",\n'
        '  "name": "<realistic Indian full name or company name>",\n'
        '  "bank_name": "<one of: HDFC Bank, ICICI Bank, SBI, Axis Bank, Kotak Mahindra Bank>",\n'
        '  "ifsc": "<valid IFSC format e.g. HDFC0001234>",\n'
        '  "account_type": "<one of: individual_savings, individual_current, corporate_current>",\n'
        '  "kyc_tier": "<one of: I1, I2, C1, C2>",\n'
        '  "risk_rating": "<one of: low, medium, high>",\n'
        '  "monthly_avg_credit": <integer INR amount>,\n'
        '  "monthly_avg_debit": <integer INR amount>,\n'
        '  "typical_hours_start": <0-23>,\n'
        '  "typical_hours_end": <0-23>,\n'
        '  "city": "<Indian city>",\n'
        '  "state": "<Indian state>",\n'
        '  "usual_counterparties": [],\n'
        '  "flags": [],\n'
        '  "_generated": true,\n'
        '  "_source": "openai"\n'
        "}"
    )
    raw = chat_completion(system, user, temperature=0.7, max_tokens=400)
    if not raw:
        return None
    try:
        # Strip possible markdown fences
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        profile = _json.loads(cleaned)
        profile["account_id"] = account_id  # ensure correct account_id
        return profile
    except Exception:
        return None


def get_profile_by_account(account_id: str) -> dict | None:
    # 1. Check static JSON
    for profile in load_user_profiles():
        if profile.get("account_id", profile.get("id")) == account_id:
            return profile
    # 2. Check runtime-generated cache
    from app.db.repositories.runtime_store import get_profile, store_profile
    cached = get_profile(account_id)
    if cached:
        return cached
    # 3. Try OpenAI, fall back to deterministic generator
    profile = _generate_profile_with_openai(account_id) or _generate_profile_fallback(account_id)
    store_profile(profile)
    return profile


def get_devices_for_account(account_id: str) -> list[dict]:
    return [d for d in load_devices() if d["account_id"] == account_id]


def get_transaction_by_id(transaction_id: str) -> dict | None:
    for txn in load_transactions():
        if txn["id"] == transaction_id:
            return txn
    return None


def get_case_by_id(case_id: str) -> dict | None:
    for case in load_cases():
        if case["id"] == case_id:
            return case
    return None


def get_transactions_for_accounts(account_ids: list[str]) -> list[dict]:
    return [
        t for t in load_transactions()
        if t["from_account"] in account_ids or t["to_account"] in account_ids
    ]
