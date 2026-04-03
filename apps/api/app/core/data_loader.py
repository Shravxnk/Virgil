"""Data loader: loads sample data from JSON files into memory."""

import json
import os
from functools import lru_cache
from typing import Any

from app.config import get_settings


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


@lru_cache()
def load_alerts() -> list[dict]:
    return _load_json("alerts.json")


@lru_cache()
def load_cases() -> list[dict]:
    return _load_json("cases.json")


@lru_cache()
def load_transactions() -> list[dict]:
    return _load_json("transactions.json")


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


def get_profile_by_account(account_id: str) -> dict | None:
    for profile in load_user_profiles():
        if profile["id"] == account_id:
            return profile
    return None


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
