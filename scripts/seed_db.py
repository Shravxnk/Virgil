#!/usr/bin/env python3
"""
Seed PostgreSQL with Indian fraud intelligence sample data.

BIFURCATION STRATEGY:
  - ACC-001 to ACC-010  : POST-transaction patterns (completed transactions)
  - ACC-011 to ACC-020  : Various approval/MFA/review/block patterns (pre-txn + post-txn)
  - ACC-021 to ACC-030  : Circular transfer ring + layering detection (account network)
  - ACC-031 to ACC-040  : Testing accounts (reserved for manual scenarios)

Usage:
    python scripts/seed_db.py

Requires DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timedelta, timezone
import uuid

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


def _generate_extended_accounts():
    """
    Generate 40 accounts for different testing scenarios.
    
    ACC-001 to ACC-010 : POST-TXN baseline accounts
    ACC-011 to ACC-020 : Approval/MFA/Review/Block pattern accounts
    ACC-021 to ACC-030 : Circular transfer ring + layering network
    ACC-031 to ACC-040 : Reserved for manual test scenarios
    """
    accounts = []
    
    # ---- ACC-001 to ACC-010: POST-TXN baseline (low risk, predictable patterns) ----
    post_txn_accounts = [
        ("ACC-001", "Rajesh Enterprises", "corporate_current", "high", 5000000, 4800000),
        ("ACC-002", "Priya Solutions Ltd", "corporate_current", "medium", 3000000, 2900000),
        ("ACC-003", "Suyash Consultants", "individual_salary", "low", 500000, 450000),
        ("ACC-004", "Aditi Traders Pvt Ltd", "proprietorship_current", "high", 2000000, 1950000),
        ("ACC-005", "Horizon Tech India", "corporate_current", "medium", 8000000, 7600000),
        ("ACC-006", "Neha Investments", "individual_savings", "low", 300000, 280000),
        ("ACC-007", "Ravi Manufacturing", "corporate_current", "high", 15000000, 14500000),
        ("ACC-008", "Ananya Finance Pvt Ltd", "corporate_current", "medium", 6000000, 5800000),
        ("ACC-009", "Vikram Retail Store", "proprietorship_current", "medium", 1500000, 1400000),
        ("ACC-010", "Deepika Exports Ltd", "corporate_current", "high", 12000000, 11500000),
    ]
    
    for i, (acc_id, name, acc_type, risk, credit, debit) in enumerate(post_txn_accounts):
        accounts.append({
            "account_id": acc_id,
            "account_number": f"5010{99000+i:05d}",
            "name": name,
            "bank_name": ["SBI", "HDFC", "ICICI", "Axis", "IDBI"][i % 5],
            "account_type": acc_type,
            "kyc_tier": "C1" if risk == "high" else ("C2" if risk == "medium" else "C3"),
            "risk_rating": risk,
            "monthly_avg_credit": credit,
            "monthly_avg_debit": debit,
            "typical_hours_start": 9,
            "typical_hours_end": 18,
            "city": ["Mumbai", "Bangalore", "Delhi", "Pune", "Hyderabad"][i % 5],
            "state": ["Maharashtra", "Karnataka", "Delhi", "Maharashtra", "Telangana"][i % 5],
            "pan": f"AA{acc_id[4:]}A{i:04d}",
            "upi_id": f"{name.lower().replace(' ', '').replace('ltd', '').replace('pvt', '')}@okaxis",
            "profile": {},
        })
    
    # ---- ACC-011 to ACC-020: Pre-TXN approval/MFA/review/block patterns ----
    pre_txn_accounts = [
        ("ACC-011", "Ankit Approved Trades", "proprietorship_current", "low", 800000, 750000),  # APPROVE
        ("ACC-012", "Bhavna MFA Required", "individual_savings", "medium", 400000, 380000),  # MFA
        ("ACC-013", "Chitra Manual Review", "individual_salary", "medium", 600000, 550000),  # MANUAL_REVIEW
        ("ACC-014", "Darpan Blocked Account", "corporate_current", "high", 3500000, 3300000),  # BLOCK
        ("ACC-015", "Esha Medium Risk", "individual_salary", "medium", 450000, 420000),  # MFA
        ("ACC-016", "Faisal Trust Account", "proprietorship_current", "low", 1200000, 1100000),  # APPROVE
        ("ACC-017", "Gauri Review Queue", "corporate_current", "high", 5000000, 4700000),  # MANUAL_REVIEW
        ("ACC-018", "Harsh Risky Txn", "individual_savings", "high", 250000, 220000),  # BLOCK
        ("ACC-019", "Ishan New Device", "individual_salary", "low", 550000, 500000),  # MFA (device)
        ("ACC-020", "Jasmine Clean Account", "corporate_current", "low", 2000000, 1900000),  # APPROVE
    ]
    
    for i, (acc_id, name, acc_type, risk, credit, debit) in enumerate(pre_txn_accounts):
        accounts.append({
            "account_id": acc_id,
            "account_number": f"5011{99000+i:05d}",
            "name": name,
            "bank_name": ["HDFC", "ICICI", "Axis", "SBI", "IDBI"][i % 5],
            "account_type": acc_type,
            "kyc_tier": "C1" if risk == "high" else ("C2" if risk == "medium" else "C3"),
            "risk_rating": risk,
            "monthly_avg_credit": credit,
            "monthly_avg_debit": debit,
            "typical_hours_start": 9,
            "typical_hours_end": 17,
            "city": ["Ahmedabad", "Chennai", "Kolkata", "Jaipur", "Lucknow"][i % 5],
            "state": ["Gujarat", "Tamil Nadu", "West Bengal", "Rajasthan", "Uttar Pradesh"][i % 5],
            "pan": f"BB{acc_id[4:]}B{i:04d}",
            "upi_id": f"{name.lower().replace(' ', '').replace('account', '')}@hdfc",
            "profile": {},
        })
    
    # ---- ACC-021 to ACC-030: Circular transfer ring ----
    # A → B → C → D → A (circular pattern - layering/structuring)
    circular_accounts = [
        ("ACC-021", "CircleNode_A", "proprietorship_current", "high", 2000000, 1900000),
        ("ACC-022", "CircleNode_B", "proprietorship_current", "high", 2000000, 1900000),
        ("ACC-023", "CircleNode_C", "corporate_current", "high", 3000000, 2900000),
        ("ACC-024", "CircleNode_D", "individual_salary", "high", 1500000, 1400000),
        ("ACC-025", "LayeringFront_1", "proprietorship_current", "high", 5000000, 4800000),
        ("ACC-026", "LayeringMiddle_2", "corporate_current", "high", 4000000, 3800000),
        ("ACC-027", "LayeringBack_3", "individual_savings", "high", 3000000, 2800000),
        ("ACC-028", "SuspiciousHub", "corporate_current", "high", 25000000, 24000000),  # Hub in network
        ("ACC-029", "StructuringAcct_Low", "individual_salary", "high", 200000, 180000),  # Structuring (small amt)
        ("ACC-030", "StructuringAcct_Split", "proprietorship_current", "high", 180000, 160000),  # Split txns
    ]
    
    for i, (acc_id, name, acc_type, risk, credit, debit) in enumerate(circular_accounts):
        accounts.append({
            "account_id": acc_id,
            "account_number": f"5021{99000+i:05d}",
            "name": name,
            "bank_name": ["SBI", "HDFC", "ICICI", "Axis", "IDBI"][i % 5],
            "account_type": acc_type,
            "kyc_tier": "C0",  # High risk KYC tier
            "risk_rating": "high",
            "monthly_avg_credit": credit,
            "monthly_avg_debit": debit,
            "typical_hours_start": 0,  # Operates 24/7 - suspicious
            "typical_hours_end": 23,
            "city": ["Gurgaon", "Noida", "Pune", "Mumbai", "Delhi"][i % 5],
            "state": ["Haryana", "Uttar Pradesh", "Maharashtra", "Maharashtra", "Delhi"][i % 5],
            "pan": f"CC{acc_id[4:]}C{i:04d}",
            "upi_id": f"circle{i}@sbi",
            "profile": {},
        })
    
    # ---- ACC-031 to ACC-040: Reserved test accounts ----
    test_accounts = [
        ("ACC-031", "Test_Manual_1", "individual_savings", "medium", 500000, 450000),
        ("ACC-032", "Test_Manual_2", "individual_salary", "low", 600000, 550000),
        ("ACC-033", "Test_Sandbox_A", "corporate_current", "high", 1000000, 950000),
        ("ACC-034", "Test_Sandbox_B", "proprietorship_current", "medium", 800000, 750000),
        ("ACC-035", "Test_Demo_Phone1", "individual_savings", "low", 400000, 380000),
        ("ACC-036", "Test_Demo_Phone2", "individual_salary", "medium", 450000, 420000),
        ("ACC-037", "Test_Demo_Phone3", "corporate_current", "high", 2000000, 1900000),
        ("ACC-038", "Test_Demo_Phone4", "proprietorship_current", "medium", 1500000, 1400000),
        ("ACC-039", "Test_Reserve_A", "individual_savings", "low", 300000, 280000),
        ("ACC-040", "Test_Reserve_B", "individual_salary", "medium", 350000, 320000),
    ]
    
    for i, (acc_id, name, acc_type, risk, credit, debit) in enumerate(test_accounts):
        accounts.append({
            "account_id": acc_id,
            "account_number": f"5031{99000+i:05d}",
            "name": name,
            "bank_name": ["HDFC", "ICICI", "Axis", "SBI", "IDBI"][i % 5],
            "account_type": acc_type,
            "kyc_tier": "C3" if risk == "low" else ("C2" if risk == "medium" else "C1"),
            "risk_rating": risk,
            "monthly_avg_credit": credit,
            "monthly_avg_debit": debit,
            "typical_hours_start": 10,
            "typical_hours_end": 20,
            "city": ["Test City", "Sandbox", "Lab", "Dev", "QA"][i % 5],
            "state": ["Test State", "Test State", "Test State", "Test State", "Test State"],
            "pan": f"DD{acc_id[4:]}D{i:04d}",
            "upi_id": f"test{i}@icic",
            "profile": {},
        })
    
    return accounts


def _generate_extended_transactions():
    """
    Generate ~100 transactions with proper patterns.
    - POST-TXN: ACC-001-010 with normal, anomalous, flagged patterns
    - Circular: ACC-021-024 in a ring
    - Layering: ACC-025-027 multi-hop
    """
    now = datetime.now(tz=timezone.utc)
    transactions = []
    
    # ---- Normal transactions (ACC-001 to ACC-010) ----
    for _ in range(15):
        from_acc = f"ACC-00{_ % 10 + 1}"
        to_acc = f"ACC-00{(_ + 1) % 10 + 1}"
        amt = [100000, 250000, 500000, 750000][_ % 4]
        ts = now - timedelta(hours=_ * 2)
        transactions.append({
            "id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
            "from_account": from_acc,
            "from_name": f"Account {from_acc}",
            "to_account": to_acc,
            "to_name": f"Account {to_acc}",
            "amount": amt,
            "currency": "INR",
            "txn_type": ["UPI", "NEFT", "IMPS", "RTGS"][_ % 4],
            "channel": "mobile",
            "status": "completed",
            "risk_score": [10, 15, 20, 5][_ % 4],
            "flagged": False,
            "timestamp": ts.isoformat(),
        })
    
    # ---- Anomalous transactions (flagged, high risk) ----
    for _ in range(8):
        from_acc = f"ACC-00{_ % 10 + 1}"
        to_acc = f"ACC-{11 + _ % 10:03d}"
        amt = [2000000, 5000000, 8000000, 3500000][_ % 4]  # Large amounts
        ts = now - timedelta(hours=100 + _ * 3)
        transactions.append({
            "id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
            "from_account": from_acc,
            "from_name": f"Account {from_acc}",
            "to_account": to_acc,
            "to_name": f"Account {to_acc}",
            "amount": amt,
            "currency": "INR",
            "txn_type": "NEFT",
            "channel": "netbanking",
            "status": "completed",
            "risk_score": [65, 72, 80, 88][_ % 4],
            "flagged": True,
            "timestamp": ts.isoformat(),
        })
    
    # ---- Circular transfers: ACC-021 → 022 → 023 → 024 → 021 ----
    circular_ring = ["ACC-021", "ACC-022", "ACC-023", "ACC-024"]
    for cycle in range(3):  # 3 full cycles
        for i in range(len(circular_ring)):
            from_acc = circular_ring[i]
            to_acc = circular_ring[(i + 1) % len(circular_ring)]
            amt = 1500000
            ts = now - timedelta(hours=200 + cycle * 24 + i * 2)
            transactions.append({
                "id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
                "from_account": from_acc,
                "from_name": from_acc,
                "to_account": to_acc,
                "to_name": to_acc,
                "amount": amt,
                "currency": "INR",
                "txn_type": "NEFT",
                "channel": "netbanking",
                "status": "completed",
                "risk_score": 90,
                "flagged": True,
                "timestamp": ts.isoformat(),
            })
    
    # ---- Layering (multi-hop): ACC-025 → 026 → 027 → 028 ----
    layering_chain = ["ACC-025", "ACC-026", "ACC-027", "ACC-028"]
    for cycle in range(2):
        for i in range(len(layering_chain) - 1):
            from_acc = layering_chain[i]
            to_acc = layering_chain[i + 1]
            amt = 3000000 + (i * 500000)
            ts = now - timedelta(hours=300 + cycle * 48 + i * 6)
            transactions.append({
                "id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
                "from_account": from_acc,
                "from_name": from_acc,
                "to_account": to_acc,
                "to_name": to_acc,
                "amount": amt,
                "currency": "INR",
                "txn_type": "NEFT",
                "channel": "netbanking",
                "status": "completed",
                "risk_score": 85,
                "flagged": True,
                "timestamp": ts.isoformat(),
            })
    
    # ---- Structuring (many small txns to bypass threshold) ----
    for i in range(12):
        from_acc = "ACC-029"
        to_acc = ["ACC-030", "ACC-031", "ACC-032", "ACC-033"][i % 4]
        amt = 95000  # Just under ₹100k reporting threshold
        ts = now - timedelta(hours=400 + i * 4)
        transactions.append({
            "id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
            "from_account": from_acc,
            "from_name": from_acc,
            "to_account": to_acc,
            "to_name": to_acc,
            "amount": amt,
            "currency": "INR",
            "txn_type": "UPI",
            "channel": "mobile",
            "status": "completed",
            "risk_score": 70,
            "flagged": True,
            "timestamp": ts.isoformat(),
        })
    
    return transactions


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
    # Accounts — Generate extended dataset (ACC-001 to ACC-040)
    # -----------------------------------------------------------------------
    accounts = _generate_extended_accounts()
    await conn.execute("TRUNCATE accounts CASCADE")
    for p in accounts:
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
            p.get("typical_hours_start", 9), p.get("typical_hours_end", 21),
            p.get("city"), p.get("state"),
            json.dumps(p),
        )
    print(f"  accounts     : {len(accounts)} rows (ACC-001 to ACC-040)")

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
    # Transactions — Generate extended dataset with patterns
    # -----------------------------------------------------------------------
    txns = _generate_extended_transactions()
    await conn.execute("TRUNCATE transactions CASCADE")
    for t in txns:
        await conn.execute(
            """INSERT INTO transactions
               (id, from_account, from_name, to_account, to_name,
                amount, currency, txn_type, channel,
                status, risk_score, flagged, post_analysis, ts)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::timestamptz)
               ON CONFLICT (id) DO NOTHING""",
            t["id"],
            t.get("from_account", ""), t.get("from_name"),
            t.get("to_account", ""), t.get("to_name"),
            int(t.get("amount", 0)), t.get("currency", "INR"),
            t.get("txn_type", "NEFT"),
            t.get("channel", "netbanking"),
            t.get("status", "completed"),
            int(t.get("risk_score", 0)), bool(t.get("flagged", False)),
            json.dumps(t.get("post_analysis", {})),
            _parse_ts(t.get("timestamp", t.get("ts"))),
        )
    print(f"  transactions : {len(txns)} rows (normal + flagged + circular + layering + structuring)")

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

