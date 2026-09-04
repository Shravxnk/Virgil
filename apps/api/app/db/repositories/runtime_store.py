"""In-memory store for records created at runtime (alerts, cases, profiles, pre-txn queue).

Used as a write-through layer when PostgreSQL is unavailable so that
dynamically generated alerts/cases are immediately readable in the same
process without needing PG.  When PG is available, PG is the source of
truth; this store acts as a same-process read cache for records just written.

Auto-seeded from data_generator at import time so tests and the live app
always have data regardless of whether the lifespan context has started.
"""

from typing import Optional

_alerts: dict[str, dict] = {}
_cases: dict[str, dict] = {}
_transactions: dict[str, dict] = {}
_profiles: dict[str, dict] = {}  # account_id → generated profile
_devices: dict[str, list[dict]] = {}  # account_id → list of devices
_pre_txn_queue: dict[str, dict] = {}  # pre_txn_id → queue entry


def store_alert(alert: dict) -> None:
    _alerts[alert["id"]] = alert


def get_alert(alert_id: str) -> Optional[dict]:
    return _alerts.get(alert_id)


def list_alerts() -> list[dict]:
    return list(_alerts.values())


def store_case(case: dict) -> None:
    _cases[case["id"]] = case


def get_case(case_id: str) -> Optional[dict]:
    return _cases.get(case_id)


def list_cases() -> list[dict]:
    return list(_cases.values())


def store_transaction(txn: dict) -> None:
    _transactions[txn["id"]] = txn


def get_transaction(txn_id: str) -> Optional[dict]:
    return _transactions.get(txn_id)


def list_transactions() -> list[dict]:
    return list(_transactions.values())


def store_profile(profile: dict) -> None:
    _profiles[profile["account_id"]] = profile


def get_profile(account_id: str) -> Optional[dict]:
    return _profiles.get(account_id)


def store_device(device: dict) -> None:
    acc = device.get("account_id", "")
    _devices.setdefault(acc, []).append(device)


def get_devices(account_id: str) -> list[dict]:
    return _devices.get(account_id, [])


# ---------------------------------------------------------------------------
# Pre-transaction queue (works entirely in-memory when PG is unavailable)
# ---------------------------------------------------------------------------

def store_pre_txn(entry: dict) -> None:
    _pre_txn_queue[entry["id"]] = entry


def get_pre_txn_entry(pre_id: str) -> Optional[dict]:
    return _pre_txn_queue.get(pre_id)


def list_pre_txn_queue(limit: int = 50) -> list[dict]:
    items = sorted(_pre_txn_queue.values(), key=lambda x: x.get("created_at", ""), reverse=True)
    return items[:limit]


def list_manual_review_queue(limit: int = 50) -> list[dict]:
    items = [
        e for e in _pre_txn_queue.values()
        if e.get("decision") == "manual_review" and not e.get("completed", False)
    ]
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return items[:limit]


def update_pre_txn(pre_id: str, updates: dict) -> bool:
    entry = _pre_txn_queue.get(pre_id)
    if not entry:
        return False
    entry.update(updates)
    return True


# ---------------------------------------------------------------------------
# Auto-seed at import time — ensures data is available even when lifespan
# hasn't fired (e.g. TestClient without `with` context, cold module import).
# The lifespan will overwrite these same keys (idempotent).
# ---------------------------------------------------------------------------
def _auto_seed() -> None:
    # NOTE: deliberately does NOT seed `_profiles` or `_devices` from the
    # synthetic generator. Those two caches are checked before the static
    # data/sample/*.json files (see get_profile_by_account /
    # get_devices_for_account in data_loader.py), and the generator's
    # synthetic accounts use a *different* name/attribute mapping for the
    # same account IDs than the static files and the account listing
    # (account_repo.find_account) use — populating them here made the UI's
    # account dropdown and the actual scoring engine disagree about who each
    # account even is. Leaving these two empty means both consistently read
    # from the same static JSON files.
    try:
        from app.core.data_generator import generate_seed_data
        _seed = generate_seed_data()
        for _a in _seed["alerts"]:
            _alerts[_a["id"]] = _a
        for _c in _seed["cases"]:
            _cases[_c["id"]] = _c
        for _t in _seed["transactions"]:
            _transactions[_t["id"]] = _t
    except Exception:
        pass  # generator unavailable — store stays empty until lifespan seeds it


_auto_seed()

