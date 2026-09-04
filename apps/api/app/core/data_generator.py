"""
Dynamic seed data generator.

Generates realistic Indian banking fraud scenarios in-memory — no JSON files
used at runtime.  Called once on startup to populate both PostgreSQL (if
available) and the in-process runtime store.

All amounts are in INR.  Data references PMLA 2002 / RBI Master Directions.
"""

from datetime import datetime, timedelta, timezone


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ts(days_ago: float, hour: int = 14, minute: int = 0) -> str:
    """ISO timestamp N days before now."""
    dt = datetime.now(tz=timezone.utc) - timedelta(days=days_ago, hours=-(hour - 14))
    return dt.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat()


ANALYSTS = ["Ananya Krishnan", "Vikram Nair", "Rohan Deshmukh", "Priya Mehta"]
BANKS = {
    "HDFC": ("HDFC Bank", "HDFC0001235"),
    "ICICI": ("ICICI Bank", "ICIC0000325"),
    "SBI": ("State Bank of India", "SBIN0001187"),
    "AXIS": ("Axis Bank", "UTIB0001234"),
    "KOTAK": ("Kotak Mahindra Bank", "KKBK0000958"),
}
CITIES = ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad", "Chennai", "Ahmedabad"]


# ── Transactions (18 records) ─────────────────────────────────────────────────

def generate_transactions() -> list[dict]:
    return [
        {
            "id": "TXN-GEN-001", "from_account": "ACC-001", "from_name": "Meridian Holdings India Pvt Ltd",
            "to_account": "ACC-011", "to_name": "Offshore Holdings Ltd",
            "amount": 4200000, "currency": "INR", "txn_type": "RTGS", "channel": "netbanking",
            "timestamp": _ts(6, 2, 15), "status": "completed", "risk_score": 92,
            "flagged": True, "case_id": "CASE-GEN-001",
            "device_id": "DEV-CORP-01", "ip_address": "103.45.12.8", "geo_location": "Mumbai",
            "utr": "UTR202604010001",
        },
        {
            "id": "TXN-GEN-002", "from_account": "ACC-011", "from_name": "Offshore Holdings Ltd",
            "to_account": "ACC-021", "to_name": "Shell Corp Alpha",
            "amount": 4100000, "currency": "INR", "txn_type": "RTGS", "channel": "netbanking",
            "timestamp": _ts(6, 3, 40), "status": "completed", "risk_score": 89,
            "flagged": True, "case_id": "CASE-GEN-001",
            "device_id": "DEV-CORP-11", "ip_address": "103.45.12.9", "geo_location": "Dubai",
            "utr": "UTR202604010002",
        },
        {
            "id": "TXN-GEN-003", "from_account": "ACC-003", "from_name": "Rajesh Patel",
            "to_account": "ACC-999", "to_name": "Hospital HDFC Collection",
            "amount": 1100000, "currency": "INR", "txn_type": "IMPS", "channel": "mobile",
            "timestamp": _ts(1, 2, 30), "status": "completed", "risk_score": 58,
            "flagged": False, "case_id": None,
            "device_id": "DEV-MOB-003", "ip_address": "117.192.44.3", "geo_location": "Pune",
            "utr": "UTR202604030003",
        },
        {
            "id": "TXN-GEN-004", "from_account": "ACC-006", "from_name": "Priya Sharma",
            "to_account": "ACC-009", "to_name": "Axis NRO Account",
            "amount": 4350000, "currency": "INR", "txn_type": "NEFT", "channel": "netbanking",
            "timestamp": _ts(4, 1, 20), "status": "completed", "risk_score": 84,
            "flagged": True, "case_id": "CASE-GEN-002",
            "device_id": "DEV-UNKNOWN-01", "ip_address": "185.220.101.55", "geo_location": "Lagos, Nigeria",
            "utr": "UTR202604020004",
        },
        {
            "id": "TXN-GEN-005", "from_account": "ACC-007", "from_name": "Suyash Sawant",
            "to_account": "ACC-012", "to_name": "Mule Account B",
            "amount": 28000000, "currency": "INR", "txn_type": "RTGS", "channel": "netbanking",
            "timestamp": _ts(5, 10, 0), "status": "completed", "risk_score": 81,
            "flagged": True, "case_id": "CASE-GEN-004",
            "device_id": "DEV-CORP-07", "ip_address": "49.207.12.33", "geo_location": "Bangalore",
            "utr": "UTR202604010005",
        },
        {
            "id": "TXN-GEN-006", "from_account": "ACC-002", "from_name": "Aarav Traders Pvt Ltd",
            "to_account": "ACC-015", "to_name": "Horizon Ventures India Pvt Ltd",
            "amount": 975000, "currency": "INR", "txn_type": "NEFT", "channel": "netbanking",
            "timestamp": _ts(5, 11, 30), "status": "completed", "risk_score": 85,
            "flagged": True, "case_id": "CASE-GEN-003",
            "device_id": "DEV-CORP-02", "ip_address": "115.240.23.45", "geo_location": "Ahmedabad",
            "utr": "UTR202604010006",
        },
        {
            "id": "TXN-GEN-007", "from_account": "ACC-008", "from_name": "Aditi Borse Enterprises",
            "to_account": "ACC-016", "to_name": "Aditi Borse Mule-1",
            "amount": 15000000, "currency": "INR", "txn_type": "RTGS", "channel": "netbanking",
            "timestamp": _ts(3, 9, 15), "status": "completed", "risk_score": 88,
            "flagged": True, "case_id": "CASE-GEN-005",
            "device_id": "DEV-CORP-08", "ip_address": "182.68.94.12", "geo_location": "Mumbai",
            "utr": "UTR202604020007",
        },
        {
            "id": "TXN-GEN-008", "from_account": "ACC-004", "from_name": "Amit Desai",
            "to_account": "ACC-019", "to_name": "Fintech Wallet",
            "amount": 52000, "currency": "INR", "txn_type": "UPI", "channel": "mobile",
            "timestamp": _ts(2, 9, 0), "status": "completed", "risk_score": 22,
            "flagged": False, "case_id": None,
            "device_id": "DEV-MOB-004", "ip_address": "117.192.44.10", "geo_location": "Mumbai",
            "utr": "UTR202604020008",
        },
        {
            "id": "TXN-GEN-009", "from_account": "ACC-005", "from_name": "Neha Gupta",
            "to_account": "ACC-018", "to_name": "Joint Savings",
            "amount": 85000, "currency": "INR", "txn_type": "NEFT", "channel": "net_banking",
            "timestamp": _ts(2, 10, 30), "status": "completed", "risk_score": 18,
            "flagged": False, "case_id": None,
            "device_id": "DEV-DESK-005", "ip_address": "115.240.12.18", "geo_location": "Delhi",
            "utr": "UTR202604020009",
        },
        {
            "id": "TXN-GEN-010", "from_account": "ACC-003", "from_name": "Rajesh Patel",
            "to_account": "ACC-020", "to_name": "HDFC Mutual Fund",
            "amount": 24000, "currency": "INR", "txn_type": "UPI", "channel": "mobile",
            "timestamp": _ts(7, 12, 0), "status": "completed", "risk_score": 12,
            "flagged": False, "case_id": None,
            "device_id": "DEV-MOB-003", "ip_address": "117.192.44.3", "geo_location": "Pune",
            "utr": "UTR202603310010",
        },
        {
            "id": "TXN-GEN-011", "from_account": "ACC-001", "from_name": "Meridian Holdings India Pvt Ltd",
            "to_account": "ACC-023", "to_name": "ACC-023",
            "amount": 9800000, "currency": "INR", "txn_type": "RTGS", "channel": "netbanking",
            "timestamp": _ts(8, 15, 0), "status": "completed", "risk_score": 76,
            "flagged": True, "case_id": "CASE-GEN-001",
            "device_id": "DEV-CORP-01", "ip_address": "103.45.12.8", "geo_location": "Mumbai",
            "utr": "UTR202603310011",
        },
        {
            "id": "TXN-GEN-012", "from_account": "ACC-006", "from_name": "Priya Sharma",
            "to_account": "ACC-024", "to_name": "ACC-024",
            "amount": 2100000, "currency": "INR", "txn_type": "NEFT", "channel": "netbanking",
            "timestamp": _ts(5, 23, 45), "status": "completed", "risk_score": 79,
            "flagged": True, "case_id": "CASE-GEN-002",
            "device_id": "DEV-UNKNOWN-02", "ip_address": "185.100.87.33", "geo_location": "Bucharest",
            "utr": "UTR202604010012",
        },
        {
            "id": "TXN-GEN-013", "from_account": "ACC-010", "from_name": "Vikram Malhotra",
            "to_account": "ACC-025", "to_name": "Crypto Exchange India",
            "amount": 650000, "currency": "INR", "txn_type": "IMPS", "channel": "mobile",
            "timestamp": _ts(3, 4, 10), "status": "completed", "risk_score": 66,
            "flagged": True, "case_id": None,
            "device_id": "DEV-MOB-010", "ip_address": "103.21.58.12", "geo_location": "Hyderabad",
            "utr": "UTR202604020013",
        },
        {
            "id": "TXN-GEN-014", "from_account": "ACC-008", "from_name": "Aditi Borse Enterprises",
            "to_account": "ACC-017", "to_name": "Aditi Borse Mule-2",
            "amount": 14200000, "currency": "INR", "txn_type": "RTGS", "channel": "netbanking",
            "timestamp": _ts(3, 11, 0), "status": "completed", "risk_score": 86,
            "flagged": True, "case_id": "CASE-GEN-005",
            "device_id": "DEV-CORP-08", "ip_address": "182.68.94.12", "geo_location": "Mumbai",
            "utr": "UTR202604020014",
        },
        {
            "id": "TXN-GEN-015", "from_account": "ACC-007", "from_name": "Suyash Sawant",
            "to_account": "ACC-013", "to_name": "Shell Entity C",
            "amount": 6500000, "currency": "INR", "txn_type": "RTGS", "channel": "netbanking",
            "timestamp": _ts(5, 14, 30), "status": "completed", "risk_score": 78,
            "flagged": True, "case_id": "CASE-GEN-004",
            "device_id": "DEV-CORP-07", "ip_address": "49.207.12.33", "geo_location": "Bangalore",
            "utr": "UTR202604010015",
        },
        {
            "id": "TXN-GEN-016", "from_account": "ACC-004", "from_name": "Amit Desai",
            "to_account": "ACC-026", "to_name": "Parents HDFC Account",
            "amount": 200000, "currency": "INR", "txn_type": "NEFT", "channel": "net_banking",
            "timestamp": _ts(1, 11, 0), "status": "completed", "risk_score": 15,
            "flagged": False, "case_id": None,
            "device_id": "DEV-DESK-004", "ip_address": "117.192.78.22", "geo_location": "Pune",
            "utr": "UTR202604030016",
        },
        {
            "id": "TXN-GEN-017", "from_account": "ACC-002", "from_name": "Aarav Traders Pvt Ltd",
            "to_account": "ACC-027", "to_name": "Vendor Payment SBI",
            "amount": 375000, "currency": "INR", "txn_type": "NEFT", "channel": "netbanking",
            "timestamp": _ts(2, 13, 0), "status": "completed", "risk_score": 28,
            "flagged": False, "case_id": None,
            "device_id": "DEV-CORP-02", "ip_address": "115.240.23.45", "geo_location": "Ahmedabad",
            "utr": "UTR202604020017",
        },
        {
            "id": "TXN-GEN-018", "from_account": "ACC-003", "from_name": "Rajesh Patel",
            "to_account": "ACC-003-SIP", "to_name": "SIP Mutual Fund SBI",
            "amount": 10000, "currency": "INR", "txn_type": "UPI", "channel": "mobile",
            "timestamp": _ts(1, 9, 0), "status": "completed", "risk_score": 8,
            "flagged": False, "case_id": None,
            "device_id": "DEV-MOB-003", "ip_address": "117.192.44.3", "geo_location": "Pune",
            "utr": "UTR202604030018",
        },
    ]


# ── Alerts (10 records) ───────────────────────────────────────────────────────

def generate_alerts() -> list[dict]:
    return [
        {
            "id": "ALT-GEN-001", "case_id": "CASE-GEN-001", "transaction_id": "TXN-GEN-001",
            "alert_type": "circular_fund_flow", "severity": "critical", "status": "investigating",
            "title": "Circular fund flow — Meridian Holdings India Pvt Ltd → Offshore Holdings",
            "description": (
                "RTGS of ₹42,00,000 at 02:15 AM to Offshore Holdings Ltd (ACC-011), "
                "followed immediately by onward transfer to Shell Corp Alpha within 90 minutes. "
                "Classic layering pattern consistent with PMLA 2002 Section 3."
            ),
            "risk_score": 92, "timestamp": _ts(6, 2, 15), "account_id": "ACC-001",
            "account_name": "Meridian Holdings India Pvt Ltd", "account_number": "30765432189",
            "bank": "State Bank of India", "ifsc": "SBIN0001187",
            "amount": 4200000, "currency": "INR", "utr": "UTR202604010001",
            "assigned_to": ANALYSTS[0], "regulatory_ref": "PMLA 2002 Section 3",
        },
        {
            "id": "ALT-GEN-002", "case_id": "CASE-GEN-002", "transaction_id": "TXN-GEN-004",
            "alert_type": "account_takeover", "severity": "critical", "status": "investigating",
            "title": "Account takeover — Priya Sharma (Axis NRO) — unknown device 185.x IP",
            "description": (
                "NEFT of ₹43,50,000 initiated from first-time device at 01:20 AM via Tor exit node "
                "IP 185.220.101.55. Account belongs to NRI customer; beneficiary opened 6 days ago."
            ),
            "risk_score": 84, "timestamp": _ts(4, 1, 20), "account_id": "ACC-006",
            "account_name": "Priya Sharma", "account_number": "917010021836",
            "bank": "ICICI Bank", "ifsc": "ICIC0000325",
            "amount": 4350000, "currency": "INR", "utr": "UTR202604020004",
            "assigned_to": ANALYSTS[1], "regulatory_ref": "RBI Master Direction 2021 Para 12",
        },
        {
            "id": "ALT-GEN-003", "case_id": "CASE-GEN-003", "transaction_id": "TXN-GEN-006",
            "alert_type": "synthetic_identity", "severity": "high", "status": "investigating",
            "title": "Synthetic identity — Horizon Ventures India Pvt Ltd KYC mismatch",
            "description": (
                "Corporate account KYC documents show mismatched CIN vs ROC records. "
                "NEFT of ₹9,75,000 to entity with no GST filings in past 18 months."
            ),
            "risk_score": 85, "timestamp": _ts(5, 11, 30), "account_id": "ACC-002",
            "account_name": "Aarav Traders Pvt Ltd", "account_number": "50100421836529",
            "bank": "HDFC Bank", "ifsc": "HDFC0001235",
            "amount": 975000, "currency": "INR", "utr": "UTR202604010006",
            "assigned_to": ANALYSTS[0], "regulatory_ref": "PMLA 2002 Section 12",
        },
        {
            "id": "ALT-GEN-004", "case_id": "CASE-GEN-004", "transaction_id": "TXN-GEN-005",
            "alert_type": "structuring_large_amount", "severity": "high", "status": "open",
            "title": "Structuring + large IMPS anomaly — Suyash Sawant",
            "description": (
                "RTGS of ₹2,80,00,000 — 350× the account's 90-day average of ₹80,000. "
                "Beneficiary account opened 10 days prior; no prior relationship."
            ),
            "risk_score": 81, "timestamp": _ts(5, 10, 0), "account_id": "ACC-007",
            "account_name": "Suyash Sawant", "account_number": "10294837562",
            "bank": "HDFC Bank", "ifsc": "HDFC0001235",
            "amount": 28000000, "currency": "INR", "utr": "UTR202604010005",
            "assigned_to": ANALYSTS[1], "regulatory_ref": "PMLA 2002 Section 3",
        },
        {
            "id": "ALT-GEN-005", "case_id": "CASE-GEN-005", "transaction_id": "TXN-GEN-007",
            "alert_type": "mule_network", "severity": "critical", "status": "escalated",
            "title": "Mule network — Aditi Borse Enterprises disbursement ring",
            "description": (
                "₹1,50,00,000 split across 2 RTGS transfers to 2 accounts opened within 7 days. "
                "Both beneficiaries transact exclusively with each other — classic mule layering."
            ),
            "risk_score": 88, "timestamp": _ts(3, 9, 15), "account_id": "ACC-008",
            "account_name": "Aditi Borse Enterprises", "account_number": "20004837291",
            "bank": "SBI", "ifsc": "SBIN0001187",
            "amount": 15000000, "currency": "INR", "utr": "UTR202604020007",
            "assigned_to": ANALYSTS[0], "regulatory_ref": "FIU-IND CTR Guideline 2023",
        },
        {
            "id": "ALT-GEN-006", "case_id": "CASE-GEN-001", "transaction_id": "TXN-GEN-011",
            "alert_type": "high_velocity", "severity": "high", "status": "investigating",
            "title": "High velocity — Meridian Holdings 3 RTGS in 6 hours",
            "description": (
                "Third RTGS transfer in 6-hour window; total ₹1,40,00,000 moved. "
                "Pattern consistent with rapid chain transfer before monitoring window closes."
            ),
            "risk_score": 79, "timestamp": _ts(8, 15, 0), "account_id": "ACC-001",
            "account_name": "Meridian Holdings India Pvt Ltd", "account_number": "30765432189",
            "bank": "State Bank of India", "ifsc": "SBIN0001187",
            "amount": 9800000, "currency": "INR", "utr": "UTR202603310011",
            "assigned_to": ANALYSTS[0], "regulatory_ref": "PMLA 2002 Section 3",
        },
        {
            "id": "ALT-GEN-007", "case_id": "CASE-GEN-002", "transaction_id": "TXN-GEN-012",
            "alert_type": "geo_anomaly", "severity": "high", "status": "open",
            "title": "Geo anomaly — Priya Sharma login from Bucharest at midnight",
            "description": (
                "Second unknown-device login from Romania (185.100.87.33) 30 min after original "
                "Lagos session. Two simultaneous active sessions from different continents."
            ),
            "risk_score": 79, "timestamp": _ts(5, 23, 45), "account_id": "ACC-006",
            "account_name": "Priya Sharma", "account_number": "917010021836",
            "bank": "ICICI Bank", "ifsc": "ICIC0000325",
            "amount": 2100000, "currency": "INR", "utr": "UTR202604010012",
            "assigned_to": ANALYSTS[1], "regulatory_ref": "RBI Master Direction 2021 Para 12",
        },
        {
            "id": "ALT-GEN-008", "case_id": None, "transaction_id": "TXN-GEN-013",
            "alert_type": "off_hours_transfer", "severity": "medium", "status": "new",
            "title": "Off-hours IMPS — Vikram Malhotra to Crypto Exchange at 04:10 AM",
            "description": (
                "IMPS of ₹6,50,000 to known crypto on-ramp account at 04:10 AM. "
                "Customer's usual window is 10 AM–6 PM. First-time crypto beneficiary."
            ),
            "risk_score": 66, "timestamp": _ts(3, 4, 10), "account_id": "ACC-010",
            "account_name": "Vikram Malhotra", "account_number": "11209876543",
            "bank": "Axis Bank", "ifsc": "UTIB0001234",
            "amount": 650000, "currency": "INR", "utr": "UTR202604020013",
            "assigned_to": ANALYSTS[2], "regulatory_ref": "",
        },
        {
            "id": "ALT-GEN-009", "case_id": "CASE-GEN-005", "transaction_id": "TXN-GEN-014",
            "alert_type": "mule_network", "severity": "critical", "status": "escalated",
            "title": "Mule network — second disbursement Aditi Borse → Mule-2",
            "description": (
                "₹1,42,00,000 RTGS to second mule account 90 minutes after first. "
                "Combined exposure ₹2,92,00,000. FIU-IND CTR threshold exceeded."
            ),
            "risk_score": 86, "timestamp": _ts(3, 11, 0), "account_id": "ACC-008",
            "account_name": "Aditi Borse Enterprises", "account_number": "20004837291",
            "bank": "SBI", "ifsc": "SBIN0001187",
            "amount": 14200000, "currency": "INR", "utr": "UTR202604020014",
            "assigned_to": ANALYSTS[0], "regulatory_ref": "FIU-IND CTR Guideline 2023",
        },
        {
            "id": "ALT-GEN-010", "case_id": "CASE-GEN-004", "transaction_id": "TXN-GEN-015",
            "alert_type": "structuring_large_amount", "severity": "high", "status": "open",
            "title": "Structuring continued — Suyash Sawant second RTGS to Shell Entity C",
            "description": (
                "Second RTGS of ₹65,00,000 same day to shell entity with no declared business. "
                "Total same-day exposure ₹3,45,00,000 — mandatory CTR filing required."
            ),
            "risk_score": 78, "timestamp": _ts(5, 14, 30), "account_id": "ACC-007",
            "account_name": "Suyash Sawant", "account_number": "10294837562",
            "bank": "HDFC Bank", "ifsc": "HDFC0001235",
            "amount": 6500000, "currency": "INR", "utr": "UTR202604010015",
            "assigned_to": ANALYSTS[1], "regulatory_ref": "PMLA 2002 Section 3",
        },
    ]


# ── Cases (5 records) ─────────────────────────────────────────────────────────

def _evidence(baseline: float, amount: float, deviation: float,
               known: bool, device_id: str, ip: str, geo: str,
               circular: bool = False) -> dict:
    return {
        "behavioral_analysis": {
            "baseline_avg_amount": baseline, "current_amount": amount, "deviation": deviation,
            "usual_time_range": "09:00-18:00 IST", "transaction_time": "02:15 IST",
            "time_anomaly": True, "usual_locations": ["Mumbai"], "transaction_location": geo,
        },
        "device_analysis": {
            "known_device": known, "device_id": device_id,
            "device_type": "Desktop", "os": "Windows 11",
            "ip_address": ip, "ip_risk": "high" if ip.startswith("185.") else "medium",
            "geo_location": geo,
        },
        "network_analysis": {
            "circular_transfers": circular, "hop_count": 3 if circular else 2,
            "connected_suspicious_accounts": 2 if circular else 1, "layering_detected": circular,
        },
    }


def generate_cases() -> list[dict]:
    return [
        {
            "id": "CASE-GEN-001", "status": "investigating",
            "title": "Circular fund flow — Meridian Holdings India Pvt Ltd",
            "risk_score": 92, "assigned_to": ANALYSTS[0],
            "created_at": _ts(8, 10), "updated_at": _ts(6, 9),
            "total_exposure": 18500000, "alert_count": 2,
            "description": (
                "Meridian Holdings India Pvt Ltd (ACC-001) initiated ₹4.2Cr RTGS to Offshore "
                "Holdings Ltd at 02:15 AM, funds onward to Shell Corp Alpha within 90 minutes. "
                "Third RTGS ₹98L same day. Total ₹1.85Cr exposure. Circular pattern detected."
            ),
            "explanation": None,
            "recommended_action": "Freeze accounts ACC-001 and ACC-011. File STR with FIU-IND. Contact RBI nodal officers.",
            "alert_ids": ["ALT-GEN-001", "ALT-GEN-006"],
            "transaction_ids": ["TXN-GEN-001", "TXN-GEN-002", "TXN-GEN-011"],
            "primary_account": "ACC-001",
            "evidence": _evidence(1200000, 4200000, 3.5, True, "DEV-CORP-01", "103.45.12.8", "Mumbai", circular=True),
            "alerts": [], "transactions": [],
            "timeline": [
                {"timestamp": _ts(8, 10), "event_type": "case_opened",
                 "description": "Case opened: circular fund flow pattern detected via graph analysis",
                 "actor": "System", "metadata": {}},
                {"timestamp": _ts(7, 11), "event_type": "alert_linked",
                 "description": "ALT-GEN-006 (high velocity) linked to case",
                 "actor": ANALYSTS[0], "metadata": {}},
                {"timestamp": _ts(6, 14), "event_type": "analyst_note",
                 "description": "Requesting ROC records for ACC-011 (Offshore Holdings Ltd)",
                 "actor": ANALYSTS[0], "metadata": {}},
            ],
            "similar_cases": [
                {"id": "CASE-GEN-003", "title": "Synthetic identity — Horizon Ventures", "similarity": 0.72, "outcome": "investigating", "risk_score": 85},
            ],
            "notes": [
                {"id": "NOTE-001", "author": ANALYSTS[0], "content": "ROC records show CIN mismatch for Offshore Holdings. Escalating to compliance team.", "timestamp": _ts(6, 15)},
            ],
        },
        {
            "id": "CASE-GEN-002", "status": "open",
            "title": "Account takeover — Priya Sharma (Axis NRO 917010021836)",
            "risk_score": 84, "assigned_to": ANALYSTS[2],
            "created_at": _ts(5, 14), "updated_at": _ts(4, 10),
            "total_exposure": 6450000, "alert_count": 2,
            "description": (
                "NRI customer Priya Sharma's ICICI account accessed from Tor exit node "
                "(185.220.101.55 Lagos, Nigeria) at 01:20 AM — first-ever unknown device login. "
                "NEFT ₹43.5L to beneficiary opened 6 days prior. Second session from Bucharest "
                "30 minutes later. Two-continent simultaneous access."
            ),
            "explanation": None,
            "recommended_action": "Block all outgoing transactions. Initiate customer callback. File FIR with cyber crime cell.",
            "alert_ids": ["ALT-GEN-002", "ALT-GEN-007"],
            "transaction_ids": ["TXN-GEN-004", "TXN-GEN-012"],
            "primary_account": "ACC-006",
            "evidence": _evidence(85000, 4350000, 51.2, False, "DEV-UNKNOWN-01", "185.220.101.55", "Lagos, Nigeria"),
            "alerts": [], "transactions": [],
            "timeline": [
                {"timestamp": _ts(5, 14), "event_type": "case_opened",
                 "description": "Case auto-opened: account takeover signals + unknown device", "actor": "System", "metadata": {}},
                {"timestamp": _ts(4, 9), "event_type": "analyst_note",
                 "description": "Customer contacted — confirms no such transaction initiated", "actor": ANALYSTS[2], "metadata": {}},
            ],
            "similar_cases": [],
            "notes": [
                {"id": "NOTE-002", "author": ANALYSTS[2], "content": "Customer confirmed fraud. Preparing STR filing.", "timestamp": _ts(4, 10)},
            ],
        },
        {
            "id": "CASE-GEN-003", "status": "investigating",
            "title": "Synthetic identity — Horizon Ventures India Pvt Ltd KYC mismatch",
            "risk_score": 85, "assigned_to": ANALYSTS[0],
            "created_at": _ts(6, 9), "updated_at": _ts(5, 16),
            "total_exposure": 2250000, "alert_count": 1,
            "description": (
                "Corporate account KYC for Horizon Ventures India shows CIN mismatch vs MCA records. "
                "GSTIN inactive since 2023. NEFT of ₹9.75L to flagged entity. "
                "Account opened with forged board resolution."
            ),
            "explanation": None,
            "recommended_action": "Refer to compliance for KYC re-verification. Freeze account pending outcome.",
            "alert_ids": ["ALT-GEN-003"],
            "transaction_ids": ["TXN-GEN-006"],
            "primary_account": "ACC-002",
            "evidence": _evidence(600000, 975000, 1.6, True, "DEV-CORP-02", "115.240.23.45", "Ahmedabad"),
            "alerts": [], "transactions": [],
            "timeline": [
                {"timestamp": _ts(6, 9), "event_type": "case_opened",
                 "description": "Case opened: KYC mismatch flagged during transaction monitoring", "actor": "System", "metadata": {}},
                {"timestamp": _ts(5, 15), "event_type": "analyst_note",
                 "description": "MCA API check confirms CIN UXXXXX does not exist in ROC records", "actor": ANALYSTS[0], "metadata": {}},
            ],
            "similar_cases": [],
            "notes": [],
        },
        {
            "id": "CASE-GEN-004", "status": "open",
            "title": "Structuring + large RTGS anomaly — Suyash Sawant",
            "risk_score": 81, "assigned_to": ANALYSTS[1],
            "created_at": _ts(5, 11), "updated_at": _ts(5, 15),
            "total_exposure": 34500000, "alert_count": 2,
            "description": (
                "Individual account (avg ₹80K/month) initiates ₹2.80Cr RTGS followed by ₹65L RTGS "
                "same day — totalling ₹3.45Cr to newly opened shell entities. "
                "350× baseline deviation. CTR threshold exceeded; mandatory filing required."
            ),
            "explanation": None,
            "recommended_action": "File CTR with FIU-IND immediately. Consider account freeze pending investigation.",
            "alert_ids": ["ALT-GEN-004", "ALT-GEN-010"],
            "transaction_ids": ["TXN-GEN-005", "TXN-GEN-015"],
            "primary_account": "ACC-007",
            "evidence": _evidence(80000, 28000000, 350.0, False, "DEV-CORP-07", "49.207.12.33", "Bangalore"),
            "alerts": [], "transactions": [],
            "timeline": [
                {"timestamp": _ts(5, 11), "event_type": "case_opened",
                 "description": "Case auto-opened: extreme amount anomaly (350× baseline)", "actor": "System", "metadata": {}},
            ],
            "similar_cases": [],
            "notes": [],
        },
        {
            "id": "CASE-GEN-005", "status": "escalated",
            "title": "Mule network — Aditi Borse Enterprises disbursement ring",
            "risk_score": 88, "assigned_to": ANALYSTS[0],
            "created_at": _ts(4, 8), "updated_at": _ts(3, 12),
            "total_exposure": 29200000, "alert_count": 2,
            "description": (
                "Aditi Borse Enterprises (ACC-008) disbursed ₹2.92Cr across 2 RTGS transfers "
                "to 2 accounts opened within the past 7 days. Both mule accounts transact "
                "exclusively with each other. FIU-IND CTR threshold exceeded by 192%."
            ),
            "explanation": None,
            "recommended_action": "Escalate to FIU-IND. File CTR. Initiate account freeze on all 3 accounts.",
            "alert_ids": ["ALT-GEN-005", "ALT-GEN-009"],
            "transaction_ids": ["TXN-GEN-007", "TXN-GEN-014"],
            "primary_account": "ACC-008",
            "evidence": _evidence(2000000, 15000000, 7.5, True, "DEV-CORP-08", "182.68.94.12", "Mumbai"),
            "alerts": [], "transactions": [],
            "timeline": [
                {"timestamp": _ts(4, 8), "event_type": "case_opened",
                 "description": "Case opened: mule network detected via graph cluster analysis", "actor": "System", "metadata": {}},
                {"timestamp": _ts(3, 11), "event_type": "case_escalated",
                 "description": "Escalated: second RTGS disbursement confirms organised mule ring", "actor": ANALYSTS[0], "metadata": {}},
            ],
            "similar_cases": [
                {"id": "CASE-GEN-001", "title": "Circular fund flow — Meridian Holdings", "similarity": 0.68, "outcome": "investigating", "risk_score": 92},
            ],
            "notes": [
                {"id": "NOTE-003", "author": ANALYSTS[0], "content": "Coordinating with FIU-IND nodal office. STR filing in progress.", "timestamp": _ts(3, 12)},
            ],
        },
    ]


# ── Public API ─────────────────────────────────────────────────────────────────

def generate_profiles() -> list[dict]:
    """Generate user profiles for all accounts referenced in transactions and cases."""
    return [
        {"account_id": "ACC-001", "name": "Meridian Holdings India Pvt Ltd", "account_number": "30765432189",
         "bank_name": "State Bank of India", "ifsc": "SBIN0001187", "account_type": "corporate_current",
         "kyc_tier": "C1", "risk_rating": "high", "monthly_avg_credit": 12000000, "monthly_avg_debit": 10800000,
         "typical_hours_start": 9, "typical_hours_end": 18, "city": "Mumbai", "state": "Maharashtra",
         "usual_counterparties": ["ACC-023"], "flags": ["prior_investigation", "shell_company_indicators"]},
        {"account_id": "ACC-002", "name": "Aarav Traders Pvt Ltd", "account_number": "50100421836529",
         "bank_name": "HDFC Bank", "ifsc": "HDFC0001235", "account_type": "corporate_current",
         "kyc_tier": "C1", "risk_rating": "medium", "monthly_avg_credit": 6000000, "monthly_avg_debit": 5400000,
         "typical_hours_start": 9, "typical_hours_end": 18, "city": "Ahmedabad", "state": "Gujarat",
         "usual_counterparties": ["ACC-027"], "flags": []},
        {"account_id": "ACC-003", "name": "Rajesh Patel", "account_number": "12345678901",
         "bank_name": "HDFC Bank", "ifsc": "HDFC0001235", "account_type": "individual_savings",
         "kyc_tier": "I1", "risk_rating": "low", "monthly_avg_credit": 150000, "monthly_avg_debit": 120000,
         "typical_hours_start": 8, "typical_hours_end": 22, "city": "Pune", "state": "Maharashtra",
         "usual_counterparties": ["ACC-999", "ACC-020", "ACC-003-SIP"], "flags": []},
        {"account_id": "ACC-004", "name": "Amit Desai", "account_number": "98765432100",
         "bank_name": "ICICI Bank", "ifsc": "ICIC0000325", "account_type": "individual_savings",
         "kyc_tier": "I1", "risk_rating": "low", "monthly_avg_credit": 200000, "monthly_avg_debit": 180000,
         "typical_hours_start": 9, "typical_hours_end": 21, "city": "Mumbai", "state": "Maharashtra",
         "usual_counterparties": ["ACC-019", "ACC-026"], "flags": []},
        {"account_id": "ACC-005", "name": "Neha Gupta", "account_number": "11122233344",
         "bank_name": "SBI", "ifsc": "SBIN0001187", "account_type": "individual_savings",
         "kyc_tier": "I1", "risk_rating": "low", "monthly_avg_credit": 100000, "monthly_avg_debit": 85000,
         "typical_hours_start": 9, "typical_hours_end": 20, "city": "Delhi", "state": "Delhi",
         "usual_counterparties": ["ACC-018"], "flags": []},
        {"account_id": "ACC-006", "name": "Priya Sharma", "account_number": "917010021836",
         "bank_name": "ICICI Bank", "ifsc": "ICIC0000325", "account_type": "individual_savings",
         "kyc_tier": "I2", "risk_rating": "low", "monthly_avg_credit": 85000, "monthly_avg_debit": 70000,
         "typical_hours_start": 10, "typical_hours_end": 18, "city": "Pune", "state": "Maharashtra",
         "usual_counterparties": [], "flags": []},
        {"account_id": "ACC-007", "name": "Suyash Sawant", "account_number": "10294837562",
         "bank_name": "HDFC Bank", "ifsc": "HDFC0001235", "account_type": "individual_savings",
         "kyc_tier": "I1", "risk_rating": "low", "monthly_avg_credit": 80000, "monthly_avg_debit": 72000,
         "typical_hours_start": 9, "typical_hours_end": 21, "city": "Bangalore", "state": "Karnataka",
         "usual_counterparties": [], "flags": []},
        {"account_id": "ACC-008", "name": "Aditi Borse Enterprises", "account_number": "20004837291",
         "bank_name": "SBI", "ifsc": "SBIN0001187", "account_type": "corporate_current",
         "kyc_tier": "C1", "risk_rating": "medium", "monthly_avg_credit": 20000000, "monthly_avg_debit": 18000000,
         "typical_hours_start": 9, "typical_hours_end": 18, "city": "Mumbai", "state": "Maharashtra",
         "usual_counterparties": [], "flags": []},
        {"account_id": "ACC-009", "name": "Axis NRO Account", "account_number": "91701002200",
         "bank_name": "Axis Bank", "ifsc": "UTIB0001234", "account_type": "individual_savings",
         "kyc_tier": "I2", "risk_rating": "medium", "monthly_avg_credit": 500000, "monthly_avg_debit": 300000,
         "typical_hours_start": 9, "typical_hours_end": 18, "city": "Mumbai", "state": "Maharashtra",
         "usual_counterparties": [], "flags": ["high_risk_jurisdiction"]},
        {"account_id": "ACC-010", "name": "Vikram Malhotra", "account_number": "11209876543",
         "bank_name": "Axis Bank", "ifsc": "UTIB0001234", "account_type": "individual_current",
         "kyc_tier": "I1", "risk_rating": "low", "monthly_avg_credit": 400000, "monthly_avg_debit": 350000,
         "typical_hours_start": 10, "typical_hours_end": 18, "city": "Hyderabad", "state": "Telangana",
         "usual_counterparties": [], "flags": []},
        {"account_id": "ACC-011", "name": "Offshore Holdings Ltd", "account_number": "77788899900",
         "bank_name": "SBI", "ifsc": "SBIN0001187", "account_type": "corporate_current",
         "kyc_tier": "C2", "risk_rating": "high", "monthly_avg_credit": 50000000, "monthly_avg_debit": 49000000,
         "typical_hours_start": 0, "typical_hours_end": 23, "city": "Dubai", "state": "N/A",
         "usual_counterparties": ["ACC-001", "ACC-021"], "flags": ["offshore_jurisdiction", "shell_company_indicators"]},
        {"account_id": "ACC-012", "name": "Mule Account B", "account_number": "33344455566",
         "bank_name": "Kotak Mahindra Bank", "ifsc": "KKBK0000958", "account_type": "individual_savings",
         "kyc_tier": "I1", "risk_rating": "high", "monthly_avg_credit": 100000, "monthly_avg_debit": 95000,
         "typical_hours_start": 9, "typical_hours_end": 21, "city": "Bangalore", "state": "Karnataka",
         "usual_counterparties": [], "flags": ["new_account", "thin_credit_file"]},
        {"account_id": "ACC-013", "name": "Shell Entity C", "account_number": "44455566677",
         "bank_name": "HDFC Bank", "ifsc": "HDFC0001235", "account_type": "corporate_current",
         "kyc_tier": "C2", "risk_rating": "high", "monthly_avg_credit": 8000000, "monthly_avg_debit": 7800000,
         "typical_hours_start": 9, "typical_hours_end": 18, "city": "Bangalore", "state": "Karnataka",
         "usual_counterparties": [], "flags": ["shell_company_indicators"]},
        {"account_id": "ACC-015", "name": "Horizon Ventures India Pvt Ltd", "account_number": "55566677788",
         "bank_name": "HDFC Bank", "ifsc": "HDFC0001235", "account_type": "corporate_current",
         "kyc_tier": "C2", "risk_rating": "high", "monthly_avg_credit": 3000000, "monthly_avg_debit": 2900000,
         "typical_hours_start": 9, "typical_hours_end": 18, "city": "Ahmedabad", "state": "Gujarat",
         "usual_counterparties": [], "flags": ["shell_company_indicators", "pep_connected"]},
        {"account_id": "ACC-016", "name": "Aditi Borse Mule-1", "account_number": "66677788899",
         "bank_name": "SBI", "ifsc": "SBIN0001187", "account_type": "individual_savings",
         "kyc_tier": "I1", "risk_rating": "high", "monthly_avg_credit": 50000, "monthly_avg_debit": 48000,
         "typical_hours_start": 9, "typical_hours_end": 21, "city": "Mumbai", "state": "Maharashtra",
         "usual_counterparties": ["ACC-017"], "flags": ["new_account", "thin_credit_file"]},
        {"account_id": "ACC-017", "name": "Aditi Borse Mule-2", "account_number": "77788899911",
         "bank_name": "ICICI Bank", "ifsc": "ICIC0000325", "account_type": "individual_savings",
         "kyc_tier": "I1", "risk_rating": "high", "monthly_avg_credit": 40000, "monthly_avg_debit": 38000,
         "typical_hours_start": 9, "typical_hours_end": 21, "city": "Mumbai", "state": "Maharashtra",
         "usual_counterparties": ["ACC-016"], "flags": ["new_account", "thin_credit_file"]},
        {"account_id": "ACC-021", "name": "Shell Corp Alpha", "account_number": "88899900011",
         "bank_name": "Kotak Mahindra Bank", "ifsc": "KKBK0000958", "account_type": "corporate_current",
         "kyc_tier": "C2", "risk_rating": "high", "monthly_avg_credit": 40000000, "monthly_avg_debit": 39500000,
         "typical_hours_start": 0, "typical_hours_end": 23, "city": "Mumbai", "state": "Maharashtra",
         "usual_counterparties": ["ACC-011"], "flags": ["shell_company_indicators", "offshore_jurisdiction"]},
    ]


def generate_devices() -> list[dict]:
    """Generate device records for key accounts."""
    return [
        {"device_id": "DEV-CORP-01", "account_id": "ACC-001", "device_type": "Desktop", "os": "Windows 11",
         "browser": "Chrome 120", "trust_score": 85, "last_seen": _ts(1, 10), "ip_address": "103.45.12.8",
         "geo_location": "Mumbai", "fingerprint": "fp-corp-001"},
        {"device_id": "DEV-CORP-02", "account_id": "ACC-002", "device_type": "Desktop", "os": "Windows 11",
         "browser": "Chrome 120", "trust_score": 80, "last_seen": _ts(2, 11), "ip_address": "115.240.23.45",
         "geo_location": "Ahmedabad", "fingerprint": "fp-corp-002"},
        {"device_id": "DEV-MOB-003", "account_id": "ACC-003", "device_type": "Mobile", "os": "Android 14",
         "browser": "PhonePe", "trust_score": 90, "last_seen": _ts(0, 9), "ip_address": "117.192.44.3",
         "geo_location": "Pune", "fingerprint": "fp-mob-003"},
        {"device_id": "DEV-DESK-004", "account_id": "ACC-004", "device_type": "Desktop", "os": "macOS 14",
         "browser": "Safari 17", "trust_score": 75, "last_seen": _ts(1, 11), "ip_address": "117.192.78.22",
         "geo_location": "Mumbai", "fingerprint": "fp-desk-004"},
        {"device_id": "DEV-DESK-005", "account_id": "ACC-005", "device_type": "Mobile", "os": "Android 14",
         "browser": "Chrome Mobile 123", "trust_score": 8, "last_seen": _ts(0, 1), "ip_address": "49.36.212.87",
         "geo_location": "Kolkata", "fingerprint": "fp-desk-005"},
        {"device_id": "DEV-UNKNOWN-01", "account_id": "ACC-006", "device_type": "Mobile", "os": "Linux",
         "browser": "Tor Browser", "trust_score": 5, "last_seen": _ts(4, 1), "ip_address": "185.220.101.55",
         "geo_location": "Lagos, Nigeria", "fingerprint": "fp-unknown-01"},
        {"device_id": "DEV-CORP-07", "account_id": "ACC-007", "device_type": "Mobile", "os": "iOS 17",
         "browser": "Safari Mobile 17", "trust_score": 10, "last_seen": _ts(0, 1), "ip_address": "117.197.34.156",
         "geo_location": "Bangalore", "fingerprint": "fp-corp-007"},
        {"device_id": "DEV-CORP-08", "account_id": "ACC-008", "device_type": "Mobile", "os": "Android 12",
         "browser": "Chrome Mobile 116", "trust_score": 12, "last_seen": _ts(0, 1), "ip_address": "185.220.101.90",
         "geo_location": "Mumbai", "fingerprint": "fp-corp-008"},
        {"device_id": "DEV-MOB-010", "account_id": "ACC-010", "device_type": "Mobile", "os": "iOS 17",
         "browser": "Safari", "trust_score": 72, "last_seen": _ts(3, 4), "ip_address": "103.21.58.12",
         "geo_location": "Hyderabad", "fingerprint": "fp-mob-010"},
        {"device_id": "DEV-UNKNOWN-02", "account_id": "ACC-006", "device_type": "Desktop", "os": "Windows 10",
         "browser": "Tor Browser", "trust_score": 3, "last_seen": _ts(5, 23), "ip_address": "185.100.87.33",
         "geo_location": "Bucharest", "fingerprint": "fp-unknown-02"},
    ]


def generate_seed_data() -> dict[str, list[dict]]:
    """Return all generated seed data as a single dict."""
    return {
        "alerts": generate_alerts(),
        "cases": generate_cases(),
        "transactions": generate_transactions(),
        "profiles": generate_profiles(),
        "devices": generate_devices(),
    }
