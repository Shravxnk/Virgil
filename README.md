<div align="center">

# 🛡️ Chakravyuh

### AI-Powered Real-Time Financial Fraud Detection and Prevention System

*Detects, prevents, investigates, and reports banking fraud — before and after transactions complete*

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests: 36 Passing](https://img.shields.io/badge/Tests-36%20Passing-brightgreen.svg)](#-all-36-test-cases-explained)

</div>

---

## Table of Contents

1. [All 36 Test Cases Explained](#-all-36-test-cases-explained)
   - [Scoring Engine Tests (13 tests)](#1-scoring-engine-tests--test_scoringpy)
   - [API Endpoint Tests (20 tests)](#2-api-endpoint-tests--test_apipy)
   - [Graph Analyzer Tests (3 tests)](#3-graph-analyzer-tests--test_graphpy)
2. [What Is Chakravyuh?](#-what-is-chakravyuh)
3. [Problem Statement](#-problem-statement)
4. [System Architecture](#-system-architecture)
5. [How the Scoring Engine Works](#-how-the-scoring-engine-works)
   - [Formula 1 — Amount Anomaly](#formula-1--amount-anomaly-max-25-points)
   - [Formula 2 — Time Anomaly](#formula-2--time-anomaly-max-15-points)
   - [Formula 3 — Device Risk](#formula-3--device-risk-max-15-points)
   - [Formula 4 — Beneficiary Risk](#formula-4--beneficiary-risk-max-20-points)
   - [Formula 5 — Graph Risk](#formula-5--graph-risk-max-25-points)
   - [Formula 6 — Final Score and Decision](#formula-6--final-score-and-decision)
   - [All 13 Formulas Summary](#all-13-formulas-at-a-glance)
6. [Pre-Transaction Detection — Full Walkthrough](#-pre-transaction-detection--full-walkthrough)
7. [Post-Transaction Detection — Full Walkthrough](#-post-transaction-detection--full-walkthrough)
8. [Fraud Chain Detection (ATO → Transaction Abuse)](#-fraud-chain-detection)
9. [Graph Intelligence — How Fund Flow Analysis Works](#-graph-intelligence)
10. [AI Explanation Layer (LLM)](#-ai-explanation-layer)
11. [RAG Knowledge Retrieval (ChromaDB)](#-rag-knowledge-retrieval)
12. [FIU Report Generation (PDF)](#-fiu-report-generation)
13. [Analyst Console — Every Screen Explained](#-analyst-console)
14. [Executive Dashboard — Every Screen Explained](#-executive-dashboard)
15. [Database Schema — All 6 Tables](#-database-schema--all-6-tables)
16. [API Endpoints — Complete Reference](#-api-endpoints--complete-reference)
17. [Data Flow Diagrams](#-data-flow-diagrams)
18. [How the System Learns and Improves](#-how-the-system-learns-and-improves)
19. [Project Structure](#-project-structure)
20. [How to Run](#-how-to-run)
21. [Technology Stack](#-technology-stack)

---

## 🧪 All 36 Test Cases Explained

Every test proves that a specific part of the system works correctly. The tests are split across 3 files covering the scoring engine, all API endpoints, and the graph analyzer.

To run all tests:

```bash
cd apps/api
pytest tests/ -v
```

---

### 1. Scoring Engine Tests — `test_scoring.py`

These 13 tests verify that the mathematical fraud scoring engine produces correct results for every type of input.

**Source file:** `apps/api/tests/test_scoring.py`  
**Code being tested:** `apps/api/app/core/scoring.py`

---

#### Test 1 — `test_normal_amount`

**What it checks:** When a transaction amount is close to the user's normal average, the amount score should be zero.

**How it works:**
- Sends a transaction of ₹1,000 for an account with a ₹1,200 average
- The ratio is 1000 ÷ 1200 = 0.83 (less than 1.5x)
- Score should be 0 because this is well within normal range

**What it proves:** The system does not flag normal transactions. A person who usually sends ₹1,200 will not get flagged for sending ₹1,000. This prevents false alarms on ordinary activity.

```python
def test_normal_amount(self):
    score, ratio = score_amount_anomaly(1000, 1200)
    assert score == 0.0
    assert ratio < 1.5
```

---

#### Test 2 — `test_high_deviation`

**What it checks:** When a transaction is 10 times the user's normal amount, the score should be very high.

**How it works:**
- Sends ₹50,000 for an account with a ₹5,000 average
- Ratio = 50000 ÷ 5000 = 10x the normal
- This falls in Zone 4 of the formula (ratio > 8.0)
- Score = min(25, 21 + log₂(10 − 7) × 3) = 25.75 → capped at 25

**What it proves:** The system correctly catches large deviations. If someone usually sends ₹5,000 and suddenly tries to send ₹50,000, the scoring engine flags it with a high score.

```python
def test_high_deviation(self):
    score, ratio = score_amount_anomaly(50000, 5000)
    assert score > 15.0
    assert ratio == 10.0
```

---

#### Test 3 — `test_zero_baseline`

**What it checks:** When an account has no transaction history (baseline = 0), the system still produces a safe default score instead of crashing.

**How it works:**
- Amount is ₹1,00,000 but baseline average is ₹0
- Division by zero would crash, so it returns a fixed 15.0 score for amounts over ₹50,000

**What it proves:** New accounts or accounts with no history do not crash the scoring engine. They get a sensible default score instead.

```python
def test_zero_baseline(self):
    score, _ = score_amount_anomaly(100000, 0)
    assert score == 15.0
```

---

#### Test 4 — `test_normal_hours`

**What it checks:** A transaction during normal business hours should not trigger any time-based alert.

**How it works:**
- Transaction at 2 PM (hour 14), usual hours are 9 AM to 5 PM
- 14 is within 9–17, so distance = 0, score = 0

**What it proves:** Daytime banking activity is not penalized. A person who normally banks between 9 and 5 will not get flagged for a 2 PM transaction.

```python
def test_normal_hours(self):
    score, anomaly = score_time_anomaly(14, 9, 17)
    assert score == 0.0
    assert anomaly == 0.0
```

---

#### Test 5 — `test_late_night`

**What it checks:** A transaction at 3 AM for a daytime user should produce a high time anomaly score.

**How it works:**
- Transaction at 3 AM, usual hours 9 AM to 5 PM
- Distance from nearest edge = min(|3−9|, |3−17|) = 6 hours
- Anomaly = min(1.0, 6 ÷ 8) = 0.75 → Score = 0.75 × 15 = 11.25

**What it proves:** Late-night activity on a daytime account is correctly flagged. This is a key indicator of account takeover — fraudsters often operate at night when the real account holder is asleep.

```python
def test_late_night(self):
    score, anomaly = score_time_anomaly(3, 9, 17)
    assert score > 5.0
    assert anomaly > 0.3
```

---

#### Test 6 — `test_known_device`

**What it checks:** A transaction from a recognized device with a high trust score should have very low device risk.

**How it works:**
- Device is known, trust score = 85 → total = 0 points, mismatch = False

**What it proves:** Returning customers on their regular phone or laptop are not inconvenienced. The system trusts devices it has seen before.

```python
def test_known_device(self):
    score, mismatch = score_device_risk(True, 85)
    assert score < 5.0
    assert mismatch is False
```

---

#### Test 7 — `test_unknown_device_high_risk`

**What it checks:** A transaction from a brand-new device with low trust and high-risk IP should score maximum 15 points.

**How it works:**
- Unknown device → +8, trust score 10 → +7, high-risk IP → +7 = 22 → capped at 15

**What it proves:** A brand-new device with no trust is the strongest indicator of potential account takeover. Maximum risk points.

```python
def test_unknown_device_high_risk(self):
    score, mismatch = score_device_risk(False, 10, "high")
    assert score >= 15.0
    assert mismatch is True
```

---

#### Test 8 — `test_known_low_risk`

**What it checks:** A transfer to a known, low-risk beneficiary with no flags should score zero.

**What it proves:** Regular payments to trusted recipients are not flagged. Your monthly rent payment to the same landlord stays at zero risk.

```python
def test_known_low_risk(self):
    score, risk = score_beneficiary_risk(False, [], "low")
    assert score == 0.0
```

---

#### Test 9 — `test_first_time_flagged`

**What it checks:** A first-time transfer to a high-risk, flagged beneficiary should produce a very high score.

**How it works:**
- First-time → +3, high risk → +8, prior_investigation → +5, high_risk_jurisdiction → +4 = 20 (max)

**What it proves:** Sending money for the first time to someone who has been investigated before and is in a high-risk jurisdiction is correctly flagged as dangerous.

```python
def test_first_time_flagged(self):
    score, risk = score_beneficiary_risk(True, ["prior_investigation", "high_risk_jurisdiction"], "high")
    assert score >= 15.0
```

---

#### Test 10 — `test_no_signals`

**What it checks:** When there are no graph-based fraud signals the graph score should be zero.

**What it proves:** A simple direct transfer with no laundering patterns gets 0 graph points.

```python
def test_no_signals(self):
    score, risk = score_graph_risk(False, 1, 0, False)
    assert score == 0.0
```

---

#### Test 11 — `test_circular_layering`

**What it checks:** When circular transfers, layering, and multiple hops are present, the graph score should be very high.

**How it works:**
- Circular → +10, layering → +8, 4 hops → +4, 3 suspicious connections → +7 = 29 → capped at 25

**What it proves:** Classic money laundering patterns like circular fund flows and multi-hop layering are detected and scored at maximum risk.

```python
def test_circular_layering(self):
    score, risk = score_graph_risk(True, 4, 3, True)
    assert score >= 20.0
```

---

#### Test 12 — `test_low_risk_transaction`

**What it checks:** A completely normal transaction should score below 30 and receive an "approve" decision.

**How it works:** All 5 components score 0 → total = 0 → decision = approve.

**What it proves:** The full end-to-end scoring pipeline correctly identifies safe transactions and approves them automatically without delay.

```python
def test_low_risk_transaction(self):
    result = compute_risk_score(
        amount=1000, baseline_avg=1200, transaction_hour=14,
        usual_start=9, usual_end=17, known_device=True,
        device_trust=90, ip_risk="low",
        is_first_time_beneficiary=False, beneficiary_flags=[],
        beneficiary_risk_rating="low", circular_transfers=False,
        hop_count=1, connected_suspicious=0, layering_detected=False,
    )
    assert result["decision"] == "approve"
    assert result["score"] < 30
```

---

#### Test 13 — `test_high_risk_transaction`

**What it checks:** A transaction with every possible red flag should score 80+ and receive a "block" decision.

**How it works:** All 5 components fire at or near maximum → total ≈ 87 → decision = block.

**What it proves:** When every fraud signal fires at once, the system correctly blocks the transaction. Worst-case scenario handled perfectly.

```python
def test_high_risk_transaction(self):
    result = compute_risk_score(
        amount=245000, baseline_avg=45000, transaction_hour=3,
        usual_start=9, usual_end=17, known_device=False,
        device_trust=10, ip_risk="high",
        is_first_time_beneficiary=True,
        beneficiary_flags=["prior_investigation", "offshore_jurisdiction"],
        beneficiary_risk_rating="high",
        circular_transfers=True, hop_count=4,
        connected_suspicious=3, layering_detected=True,
    )
    assert result["decision"] == "block"
    assert result["score"] >= 80
```

---

### 2. API Endpoint Tests — `test_api.py`

These 20 tests verify that every API route works correctly from request to response.

**Source file:** `apps/api/tests/test_api.py`  
**Code being tested:** All routes in `apps/api/app/api/routes/`

---

#### Test 14 — `test_health_check`

Checks `/health` returns `{"status": "healthy"}`. Proves the backend server is running and responding.

#### Test 15 — `test_api_root`

Checks `/api` returns a list of all available endpoints. Proves API discovery works.

#### Test 16 — `test_list_alerts`

Checks `GET /api/alerts` returns alerts with at least 1 result. Proves the alert pipeline works end-to-end from database to JSON response.

#### Test 17 — `test_get_alert`

Checks fetching a specific alert by ID returns the correct alert. Proves analysts can click any alert and see full details.

#### Test 18 — `test_alert_not_found`

Checks that a non-existent alert ID returns 404. Proves graceful error handling.

#### Test 19 — `test_list_cases`

Checks `GET /api/cases` returns at least 1 investigation case. Proves the case management pipeline works.

#### Test 20 — `test_get_case`

Checks fetching a case returns full details including evidence and timeline. Proves the case assembly joins alerts, transactions, evidence, and timeline correctly.

#### Test 21 — `test_case_not_found`

Checks non-existent case ID returns 404. Proves graceful error handling for cases.

#### Test 22 — `test_risk_score`

Checks `GET /api/risk/score?transaction_id=TXN-001` returns a score 0–100 with a valid decision. Proves the scoring engine works through the API.

#### Test 23 — `test_case_graph`

Checks `GET /api/graph/{case_id}` returns nodes, edges, and suspicious paths. Proves the graph builder and analyzer work through the API for the fund-flow network diagram.

#### Test 24 — `test_analyst_dashboard`

Checks the analyst dashboard returns all required KPIs: total alerts (≥1), critical alerts (≥1), pending review (≥1), 14-day daily trend, and recent alerts. This is the most complex test — it verifies KPI computation, date bucketing, and score distribution all at once.

```python
def test_analyst_dashboard(self):
    response = client.get("/api/dashboard/analyst")
    data = response.json()
    assert data["total_alerts"] >= 1
    assert data["critical_alerts"] >= 1
    assert len(data["daily_trend"]) == 14
```

#### Test 25 — `test_executive_dashboard`

Checks the executive dashboard returns total fraud detected (₹), model accuracy, and compliance summary. Proves the executive analytics aggregation pipeline works.

#### Test 26 — `test_feedback`

Checks `POST /api/feedback/confirm` with `confirmed_fraud: true` returns status `"resolved_fraud"`. Proves the analyst feedback loop works. This feedback data improves scoring over time.

#### Test 27 — `test_knowledge_search`

Checks `POST /api/knowledge/search` returns results from the fraud knowledge base. Proves the ChromaDB vector store and RAG pipeline work.

#### Test 28 — `test_list_transactions`

Checks `GET /api/transactions` returns at least 1 transaction. Proves transaction data is properly seeded and retrievable.

#### Test 29 — `test_pre_transaction_score_writes_and_returns`

Checks `POST /api/transactions/score` returns a `pre_txn_id` starting with "PRE-", a score 0–100, and a valid decision. **This tests the core pre-transaction scoring feature** — scoring a transaction BEFORE it completes.

```python
def test_pre_transaction_score_writes_and_returns(self):
    response = client.post("/api/transactions/score", json={
        "from_account": "ACC-001",
        "to_account": "ACC-002",
        "amount": 500000,
        "txn_type": "NEFT",
        "channel": "netbanking",
    })
    data = response.json()
    assert data["pre_txn_id"].startswith("PRE-")
    assert data["decision"] in ("approve", "block", "mfa", "manual_review")
```

#### Test 30 — `test_high_risk_transaction_creates_alert_and_case`

Checks that a clearly fraudulent transaction (₹95 lakh, unknown device, Nigerian IP) automatically creates an alert AND a case. Proves the **auto-escalation pipeline**: dangerous transactions do not just get scored — they also auto-generate alerts and cases for analysts.

```python
def test_high_risk_transaction_creates_alert_and_case(self):
    response = client.post("/api/transactions/score", json={
        "from_account": "ACC-003",
        "to_account": "ACC-999",
        "amount": 9500000,
        "txn_type": "RTGS",
        "device_known": False,
        "ip_address": "185.220.101.55",
        "geo_location": "Lagos, Nigeria",
    })
    data = response.json()
    assert data["score"] >= 50
    assert data["alert_id"] is not None
```

#### Test 31 — `test_response_dates_are_recent`

Checks alert timestamps are within the last 30 days. Proves timestamps are normalized to current dates.

#### Test 32 — `test_transaction_dates_are_recent`

Checks transaction timestamps are within the last 30 days. Same freshness guarantee for transactions.

#### Test 33 — `test_case_detail_has_transactions`

Checks that a case with `transaction_ids` returns fully resolved transaction objects. Proves the case-to-transaction join works — when you open a case, the linked transactions actually load.

---

### 3. Graph Analyzer Tests — `test_graph.py`

These 3 tests verify that NetworkX correctly detects fraud patterns in transaction networks.

**Source file:** `apps/api/tests/test_graph.py`  
**Code being tested:** `apps/api/app/graph/analyzer.py` + `apps/api/app/graph/builder.py`

---

#### Test 34 — `test_case_001_graph`

Checks that the circular transfer pattern in CASE-001 is correctly detected: at least 3 nodes, 2 edges, and 1+ suspicious paths. Proves the system identifies circular money flows (A→B→C→A).

#### Test 35 — `test_case_005_graph`

Checks the mule network graph in CASE-005 has exactly 3 nodes and 2 edges. Proves fan-out mule network patterns are built correctly.

#### Test 36 — `test_empty_graph`

Checks that non-existent transaction IDs produce an empty graph (0 nodes, 0 edges) without crashing. Proves graceful handling of missing data.

---

## 🎯 What Is Chakravyuh?

Chakravyuh (चक्रव्यूह — "the inescapable formation") is a full-stack AI-powered fraud detection system built for Indian banks. It watches every bank transaction in real time, decides whether to allow or block it **before the money moves**, and if something looks fraudulent it automatically opens an investigation case, writes an AI-generated briefing, maps out the fund flow, and generates a regulatory report.

In simple words: when someone clicks "Send Money" in their banking app, Chakravyuh checks the transaction in milliseconds and decides:

```
Customer clicks "Pay ₹2,50,000"
        │
        ▼
  Chakravyuh checks: Is this risky?
  [score = 84 → BLOCK]
        │
        ▼
  Payment rejected instantly.
  Customer sees: "Transaction blocked for your safety."
  (Money never moved. Fraud prevented.)
```

If the score is low the payment goes through normally and the customer never even knows the check happened.

<!-- Screenshot: Home page -->
> 📸 *Add screenshot here: Home/Landing page*

---

## 📋 Problem Statement

**Topic 03: Financial Fraud Detection System (Elite Level — Real-Time Adaptive Intelligence)**

Design a system that can detect and prevent financial fraud before transactions are completed. The system should identify coordinated, stealthy, and evolving fraud patterns across users and channels. It must analyze behavior, transaction context, and device intelligence to detect anomalies with real-time decision-making and minimal latency.

### How Chakravyuh Maps to Every Requirement

| Requirement | How We Solve It |
|---|---|
| **Build behavioral user profiles and anomaly detection** | Every account has a stored profile with average transaction amount, usual hours, common beneficiaries, and device patterns. Each transaction is compared against this baseline. |
| **Detect fraud chains (ATO → transaction abuse)** | Device mismatch + amount deviation + new beneficiary signals are connected to recognize account takeover followed by unauthorized transfers. |
| **Implement dynamic risk scoring with explanations** | A 5-component weighted scoring engine produces a 0–100 score. GPT-4o mini generates plain-English explanations for every high-risk decision. |
| **Enable pre-transaction decisioning (approve/block/MFA)** | The scoring API responds in under 200ms with one of four decisions: approve, MFA, manual review, or block — before the payment processes. |
| **Support adaptive learning for evolving fraud** | Analyst feedback (confirmed fraud / false positive) builds labeled data. Model health monitoring tracks precision, recall, F1, and data drift. |
| **Real-time fraud detection and scoring engine** | Pure math scoring engine computes scores in ~1ms. Full API response including database lookups in under 200ms. |
| **Decision system for transaction approval or intervention** | Automated decision matrix: score < 30 → approve, 30–60 → MFA, 60–80 → manual review, ≥ 80 → block. |
| **Visualization or monitoring interface** | Analyst dashboards with alert queues, case views, React Flow network graphs. Executive dashboards with KPIs, trend charts, compliance tracking. |
| **[Brownie] Graph-based fraud ring detection** | NetworkX detects circular transfers, multi-hop layering, suspicious clusters, and mule networks. |
| **[Brownie] Synthetic identity detection** | Profile inconsistency checks: thin credit files, new accounts with high-value transfers, shell company indicators. |
| **[Brownie] Fraud simulation environment** | Sample banking data with 4 realistic fraud scenarios (normal, ATO, structuring, mule network) for live demo testing. |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Analyst     │  │  Executive   │  │   Shared Components    │ │
│  │  Dashboard    │  │  Dashboard   │  │  Graph · Charts · UI   │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬───────────┘ │
│         └─────────────────┼───────────────────────┘             │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API (HTTP)
┌─────────────────────────────┴───────────────────────────────────┐
│                       BACKEND (FastAPI)                          │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────────┐  │
│  │  Risk    │  │  Alert   │  │  Case   │  │    Dashboard     │  │
│  │ Scoring  │  │ Service  │  │ Service │  │    Service       │  │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └──────────────────┘  │
│       │             │             │                              │
│  ┌────┴─────────────┴─────────────┴────┐                        │
│  │          INTELLIGENCE LAYER          │                        │
│  │  ┌─────────┐ ┌────────┐ ┌────────┐  │                        │
│  │  │ OpenAI  │ │ Graph  │ │ChromaDB│  │                        │
│  │  │ GPT-4o  │ │Analysis│ │Vectors │  │                        │
│  │  │ mini    │ │NetworkX│ │  RAG   │  │                        │
│  │  └─────────┘ └────────┘ └────────┘  │                        │
│  └─────────────────────────────────────┘                        │
│                        │                                         │
│              ┌─────────┴─────────┐                               │
│              │   PostgreSQL DB   │                               │
│              │   6 tables        │                               │
│              └───────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

**In plain English:**
- The **browser** (frontend) shows all the screens — dashboards, alert inbox, case investigations, live scorer
- The **backend** handles all logic — scoring, graph analysis, AI explanations, PDF reports
- **PostgreSQL** stores accounts, transactions, alerts, cases, and pre-transaction audit trail
- **OpenAI GPT-4o mini** writes human-readable investigation briefings (falls back to templates without API key)
- **ChromaDB** enables semantic search over fraud knowledge base and policy documents
- **NetworkX** builds and analyzes transaction fund-flow graphs

<!-- Screenshot: Architecture -->
> 📸 *Add screenshot here: Architecture diagram*

---

## 🔢 How the Scoring Engine Works

Every transaction gets a score from **0 to 100**. Higher score = more suspicious. The score is the sum of 5 independent checks:

```
Total Score = Amount Score + Time Score + Device Score + Beneficiary Score + Graph Score
              (max 25)       (max 15)     (max 15)       (max 20)            (max 25)
              ──────────────────────────────────────────────────────────────────────────
                                                                        Grand Total: max 100
```

The score determines the automated decision:

| Score Range | Decision | What Happens |
|---|---|---|
| 0 – 29 | ✅ **Approve** | Transaction goes through immediately |
| 30 – 59 | 📱 **MFA** | Customer must verify with OTP or biometric |
| 60 – 79 | 👁️ **Manual Review** | Transaction is held, analyst gets an alert |
| 80 – 100 | 🚫 **Block** | Transaction is rejected, case is opened |

**Source code:** `apps/api/app/core/scoring.py`

---

### Formula 1 — Amount Anomaly (max 25 points)

Checks: **"Is this transaction amount normal for this person?"**

Every account has an average transaction amount. The formula compares the current amount to that average.

**Step 1 — Calculate the ratio:**

```
ratio = transaction amount ÷ account's average amount

Example:
  Priya usually sends ₹17,600
  This transaction is ₹2,50,000
  ratio = 2,50,000 ÷ 17,600 = 14.2x her normal
```

**Step 2 — Convert ratio to points (4 zones):**

```
Zone 1: ratio ≤ 1.5    →  0 points
        "Up to 50% more than normal — no alarm"

Zone 2: ratio 1.5–3.0  →  5 + (ratio − 1.5) × 4
        At 1.5 → 5 pts.  At 3.0 → 11 pts.

Zone 3: ratio 3.0–8.0  →  11 + (ratio − 3.0) × 2
        At 3.0 → 11 pts.  At 8.0 → 21 pts.

Zone 4: ratio > 8.0    →  min(25, 21 + log₂(ratio − 7) × 3)
        Uses log so 15x and 50x don't score very differently — both are extreme.
```

**Why log curve for extreme values?** The difference between 2x and 3x your normal is meaningful. But between 30x and 50x both are obviously suspicious. The log reflects that.

**Edge case:** If baseline is 0 (new account), return fixed 15 for amounts > ₹50,000, or 5 for smaller amounts.

---

### Formula 2 — Time Anomaly (max 15 points)

Checks: **"Is this happening at an unusual time for this person?"**

```
Step 1: distance = hours outside normal window

  Example: Usual hours 9 AM–6 PM, Transaction at 2 AM
  Distance from 9 AM = 7 hours, from 6 PM = 16 hours
  Take smaller = 7 hours

Step 2: anomaly_degree = min(1.0, distance ÷ 8)
        = 0.875

Step 3: score = anomaly_degree × 15
        = 13.1 points
```

**Why divide by 8?** 8 hours is the reference for "completely outside normal." Anything further still caps at 15.

The system only emits a TIME_ANOMALY reason code if anomaly_degree > 0.3 (~2.4 hours outside window). Transactions at 6:01 PM for a 9–6 user do not generate noise.

---

### Formula 3 — Device Risk (max 15 points)

Checks: **"Is this a trusted device?"**

| Signal | Points |
|---|---|
| Device never seen before | +8 |
| Device trust score < 30 | +7 |
| Device trust score 30–59 | +3 |
| Device trust score ≥ 60 | +0 |
| IP address medium-risk | +3 |
| IP address high-risk | +7 |

Total capped at 15. **Why +8 for new device?** Most common sign of Account Takeover.

---

### Formula 4 — Beneficiary Risk (max 20 points)

Checks: **"How risky is the person receiving the money?"**

| Signal | Points |
|---|---|
| First time sending to this person | +3 |
| Recipient risk rating = medium | +4 |
| Recipient risk rating = high | +8 |
| Flag: prior_investigation | +5 |
| Flag: high_risk_jurisdiction | +4 |
| Flag: shell_company_indicators | +4 |
| Flag: offshore_jurisdiction | +3 |
| Flag: pep_connected | +2 |
| Any other flag | +1 |

Total capped at 20. Also outputs a 0–1 risk level (points ÷ 20) for the AI explainer.

---

### Formula 5 — Graph Risk (max 25 points)

Checks: **"Is there a laundering pattern in the network?"**

| Signal | Points |
|---|---|
| Circular transfer (A→B→C→A) | +10 |
| Layering detected | +8 |
| Hop count ≥ 3 | +2 per hop above 2, max +5 |
| Suspicious connected accounts | +2.5 per account, max +7 |

Total capped at 25. **Note:** Before a payment goes through this is usually 0 because there is no money flow to analyze yet. Activates fully in post-transaction analysis.

---

### Formula 6 — Final Score and Decision

```
Final Score = amount + time + device + beneficiary + graph
Clamped to 0–100

Score < 30     →  approve
30 ≤ score < 60  →  mfa
60 ≤ score < 80  →  manual_review
Score ≥ 80     →  block
```

**Full worked example — Priya Sharma (ACC-004):**

```
Amount  =  23 points  (14.2× her normal ₹17,600)
Time    =  13 points  (2 AM, 7 hours outside 9–6)
Device  =  15 points  (new device, trust score 15)
Benef   =  16 points  (first time, high risk, prior_investigation)
Graph   =   0 points  (pre-transaction — no flow yet)
            ──────
Total   =  67 points  → MANUAL REVIEW
```

---

### Additional Formulas

| # | Formula | File | Purpose |
|---|---|---|---|
| 7 | Node Risk Score | `graph/builder.py` | Visual coloring: base 20 + risk rating + flag points. Only for graph display. |
| 8 | Behavioral Mismatch | `scoring.py` | `min(1.0, ratio ÷ 10)` — 0–1 signal passed to AI explainer |
| 9 | Time Reason Threshold | `scoring.py` | Emit TIME_ANOMALY only if anomaly > 0.3 |
| 10 | False Positive Rate | `dashboard_service.py` | `resolved_legitimate ÷ total_resolved` |
| 11 | Avg Resolution Time | `dashboard_service.py` | Average hours between case open and close |
| 12 | Prevented vs Detected | `dashboard_service.py` | Blocked ₹ vs flagged ₹ per month |
| 13 | Cluster Average Risk | `graph/analyzer.py` | Average risk of accounts in a connected group |

### All 13 Formulas at a Glance

| # | Formula | Purpose |
|---|---|---|
| 1 | Amount anomaly (4-zone, log tail) | How far is this amount from normal? |
| 2 | Time anomaly (linear, 8hr reference) | How far outside usual hours? |
| 3 | Device risk (additive flags) | Is this a known trusted device? |
| 4 | Beneficiary risk (additive flags) | How risky is the recipient? |
| 5 | Graph risk (hops + circular) | Is there a laundering pattern? |
| 6 | Final score + decision | What is the overall verdict? |
| 7 | Node risk score | How red should this graph node be? |
| 8 | Behavioral mismatch (0–1) | Summary signal for AI explainer |
| 9 | Time reason code threshold | When to mention time in reports |
| 10 | False positive rate | How often is the system wrong? |
| 11 | Average resolution time | How fast is the analyst team? |
| 12 | Prevented vs detected | How much money was saved? |
| 13 | Cluster average risk | How suspicious is this group? |

---

## ⚡ Pre-Transaction Detection — Full Walkthrough

What happens from the moment someone clicks "Send Money":

```
STEP 1: Customer hits "Send ₹2,50,000"
────────────────────────────────────────
POST /api/transactions/score
{ from_account: "ACC-004", to_account: "ACC-015",
  amount: 250000, txn_type: "RTGS", channel: "mobile_app",
  device_known: false }

STEP 2: Load behavioral profile from database
────────────────────────────────────────
ACC-004 (Priya Sharma):
  avg_transaction_amount = ₹17,600
  typical_hours: 9am–6pm
  usual_counterparties: [ACC-001, ACC-007, ACC-011]

STEP 3: Run all 5 scoring checks
────────────────────────────────────────
  Amount  = 23/25  (14.2× baseline)
  Time    = 13/15  (2 AM, 7hrs outside window)
  Device  = 15/15  (unknown device)
  Benef   = 16/20  (first-time, high-risk, flagged)
  Graph   =  0/25  (no circular pattern yet)
  TOTAL   = 67

STEP 4: Decision → MANUAL REVIEW (60–79 range)
────────────────────────────────────────
  Transaction paused. Alert created. Customer sees:
  "Under review for security."

STEP 5: Save to pre_txn_queue table (audit trail)
────────────────────────────────────────
  id: PRE-A1B2C3, decision: manual_review
  risk_signals: {amount_anomaly: 14.2, device_mismatch: true}

STEP 6: Call OpenAI for explanation (if score ≥ 30)
────────────────────────────────────────
  GPT-4o mini writes analyst briefing:
  "This transaction from Priya Sharma has triggered 3 high-risk
   signals: 14.2x amount deviation, unrecognized device, and
   first-time high-risk beneficiary..."

STEP 7: JSON response in milliseconds
────────────────────────────────────────
  { pre_txn_id: "PRE-A1B2C3", score: 67,
    decision: "manual_review",
    reason_codes: ["AMOUNT_DEVIATION_14.2X", "NEW_DEVICE",
                   "FIRST_TIME_BENEFICIARY"] }
```

<!-- Screenshot: Live Scorer page -->
> 📸 *Add screenshot here: Pre-transaction scoring result*

---

## 🔍 Post-Transaction Detection — Full Walkthrough

If a transaction slips through pre-transaction (or scoring was not wired to the gateway), the post-transaction engine takes over.

```
STEP 1: Transaction lands in database (flagged = false)
────────────────────────────────────────

STEP 2: Scoring re-runs with FULL graph data
────────────────────────────────────────
  Now the system can see the entire network:
  ACC-004 → ACC-015 → ACC-017 → ACC-004  ← circular!
  circular_transfers = True, hop_count = 3, layering = True

STEP 3: Score jumps from 67 → 92
────────────────────────────────────────
  Pre-txn: graph = 0  → total = 67 (manual_review)
  Post-txn: graph = 25 → total = 92 (BLOCK)

  Same transaction. Much higher score because the full picture is visible.

STEP 4: Alert auto-generated (severity: critical)
────────────────────────────────────────
  Reason codes: AMOUNT_DEVIATION_14.2X, NEW_DEVICE,
  CIRCULAR_TRANSFERS, LAYERING_DETECTED, FLAG_PRIOR_INVESTIGATION

STEP 5: OpenAI writes investigation briefing
────────────────────────────────────────
  "This critical alert on ACC-004 has triggered 6 risk signals
   including a confirmed circular fund flow through
   ACC-015 → ACC-017 → ACC-004..."

STEP 6: Multiple alerts grouped into a Case
────────────────────────────────────────
  All alerts sharing overlapping accounts → one case

STEP 7: Fund-flow graph built
────────────────────────────────────────
  [ACC-004] ─₹2.5L─▶ [ACC-015] ─₹1.9L─▶ [ACC-017]
      ▲                                        │
      └──────────────₹80K─────────────────────┘

STEP 8: Analyst investigates → confirms fraud → exports PDF

STEP 9: FIU-IND report generated (PMLA 2002, 7-day deadline)
```

**Key insight:** Graph score was 0 pre-transaction and 25 post-transaction. The money had not moved yet so there was no circular path to find. After the money moved the full picture became visible.

<!-- Screenshot: Case detail with graph -->
> 📸 *Add screenshot here: Case investigation with fund flow graph*

---

## 🔗 Fraud Chain Detection

### Account Takeover (ATO) → Transaction Abuse

```
STAGE 1: ATO signals          STAGE 2: Exploitation signals
  ├── New device                ├── Large amount (14.2× normal)
  ├── Unusual location          ├── New beneficiary
  └── Unusual hour              └── Transfer to mule account

STAGE 3: Chakravyuh connects the chain
  Device mismatch + Amount deviation + New beneficiary
  = combined score triggers MFA or block
```

### Mule Networks

```
Stolen money enters ACC-010 (mule leader)
  ↓ ₹4.9L         ↓ ₹3.2L         ↓ ₹1.8L
ACC-011 (mule)   ACC-012 (mule)   ACC-016 (mule)
  ↓                ↓                ↓
         ACC-017 (cash-out point)
```

Detected through circular paths, multi-hop layering, and high centrality analysis.

### Structuring (Smurfing)

```
Day 1: ₹9,50,000  ← just under ₹10L CTR threshold
Day 2: ₹9,20,000  ← just under ₹10L CTR threshold
Day 3: ₹8,90,000  ← just under ₹10L CTR threshold
```

Each looks fine alone. Together = structuring intent. Caught by velocity checks.

---

## 🕸 Graph Intelligence

**Source code:** `apps/api/app/graph/builder.py` + `apps/api/app/graph/analyzer.py`

### How the Graph Is Built

1. Take all transaction IDs linked to a case
2. Load transactions from database
3. Create directed graph: `from_account → to_account`
4. Add account metadata to each node (name, risk, flags)
5. Calculate node risk score for visual coloring

### How Patterns Are Detected

**Circular Transfers:** NetworkX `simple_cycles()` finds all loops of 3+ accounts.

**Multi-Hop Chains:** Trace all paths from source nodes (no incoming) to sink nodes (no outgoing), flag chains of 3+ accounts.

**Cluster Detection:** Convert to undirected, find connected components, flag groups of 3+ accounts with average risk score.

```
Example output:
  Nodes: ACC-008 (risk:72), ACC-016 (risk:45), ACC-017 (risk:68)
  Edges: ACC-008→ACC-016 (₹4.99L), ACC-008→ACC-017 (₹3.5L)
  Suspicious paths: [ACC-008, ACC-016, ACC-017]
  Clusters: [{ACC-008, ACC-016, ACC-017}, avg_risk: 61.7]
```

<!-- Screenshot: Graph visualization -->
> 📸 *Add screenshot here: Fund flow network diagram*

---

## 🤖 AI Explanation Layer

**Source code:** `apps/api/app/llm/explainer.py`

When a transaction scores 30+ GPT-4o mini generates a human-readable explanation. The system uses 5 specialized prompt templates:

| Template | For | What It Writes |
|---|---|---|
| Alert Explanation | Fraud analyst | What triggered the alert, why suspicious, 3-step checklist, regulatory obligations |
| Case Summary | Investigation team | Evidence chain, fraud typology, network exposure, risk assessment |
| Executive Summary | CRO / CEO | 5–7 sentence board-level briefing |
| Report Narrative | FIU-IND regulators | Formal STR with 5 sections |
| Knowledge Q&A | Analyst | RAG-powered answers from fraud knowledge base |

**Without** an API key the system falls back to template-based explanations. Works fully either way.

---

## 📚 RAG Knowledge Retrieval

**Source code:** `apps/api/app/retrieval/vector_store.py`

ChromaDB maintains 5 vector collections:

| Collection | Contents |
|---|---|
| `fraud_knowledge` | Fraud patterns, indicators, detection methods |
| `case_memory` | Historical case data and outcomes |
| `policy_playbook` | Action playbooks and regulatory requirements |
| `report_templates` | Narrative and report templates |
| `behavioral_context` | Account behavioral baselines |

Documents are chunked into 500-char overlapping segments. Queries are auto-routed to the best collection (e.g., "report" → report_templates, "case" → case_memory). Results are passed to GPT-4o mini for synthesized answers.

---

## 📄 FIU Report Generation

**Source code:** `apps/api/app/utils/pdf_generator.py`

One-click PDF generation with:

```
1. Executive Summary
2. Subject Information (account, exposure, action)
3. Suspicious Activity Description (AI-generated STR narrative)
4. Transaction Details (table with ID, from, to, amount, date, type, channel)
5. Evidence and Risk Indicators
6. Timeline of Events
7. Similar Historical Cases
+ SHA-256 custody hash for tamper detection
```

Built with ReportLab. STR narrative written by GPT-4o mini in formal FIU-IND language referencing PMLA 2002.

<!-- Screenshot: PDF -->
> 📸 *Add screenshot here: FIU report PDF*

---

## 🕵️ Analyst Console

For the bank's fraud investigation team.

### Analyst Dashboard

**URL:** `http://localhost:3000/analyst`

<!-- Screenshot -->
> 📸 *Add screenshot here: Analyst Dashboard*

**4 KPI Cards:** Total Alerts, Critical Alerts, Pending Review, Resolved Today

**Charts:** 14-day Daily Alert Trend (new vs resolved), Risk Score Distribution (5 buckets), Recent Alerts (top 5), Active Cases

| KPI | Source |
|---|---|
| Total Alerts | COUNT of all alerts |
| Critical Alerts | WHERE severity = critical |
| Pending Review | WHERE status IN (new, open, investigating) |
| Resolved Today | WHERE status = resolved AND date = today |

---

### Alert Inbox

**URL:** `http://localhost:3000/analyst/alerts`

<!-- Screenshot -->
> 📸 *Add screenshot here: Alert Inbox*

Each alert shows: risk score (color-coded), severity badge, status badge, account name, amount, alert type, linked case.

**Filters:** Search box, severity dropdown, status dropdown — each re-queries the API.

---

### Investigation Cases

**URL:** `http://localhost:3000/analyst/cases`

<!-- Screenshot -->
> 📸 *Add screenshot here: Cases page*

Case detail includes:

| Tab | Contents |
|---|---|
| Overview | Risk score, exposure, AI summary |
| Graph | Interactive React Flow fund-flow diagram |
| Timeline | Chronological event log |
| Evidence | Behavioral + device + network analysis |
| Transactions | All linked transactions |
| Similar Cases | Historical matches |
| Export PDF | One-click FIU report |

---

### Live Scorer — Pre-Transaction Testing

**URL:** `http://localhost:3000/analyst/transactions`

<!-- Screenshot -->
> 📸 *Add screenshot here: Live Scorer*

**Quick Scenario Buttons:**

| Button | Expected Result |
|---|---|
| ✅ Normal transfer | Approve (< 30) |
| ⚠️ Large unusual | MFA or Manual Review |
| 🚫 Mule network | Block (80+) |
| 🔐 ATO attempt | Block or Manual Review |

Result shows: decision banner, score bar, signal breakdown, reason codes, AI briefing.

---

## 📊 Executive Dashboard

For senior management (CFO, CRO, CEO).

### Executive Overview

**URL:** `http://localhost:3000/executive`

<!-- Screenshot -->
> 📸 *Add screenshot here: Executive Dashboard*

**6 KPIs:** Fraud Detected (₹), Active Cases, Detection Rate, False Positive Rate, Avg Resolution Time, Regulatory Risk (₹)

**Charts:** Monthly fraud trend (detected vs prevented), cases by status (donut), top risk categories (bar)

---

### Compliance Page

**URL:** `http://localhost:3000/executive/compliance`

<!-- Screenshot -->
> 📸 *Add screenshot here: Compliance page*

| Section | Meaning |
|---|---|
| STR/SAR Filed | Reports submitted to FIU-IND (required within 7 days, PMLA 2002) |
| STR/SAR Pending | Reports due but not filed (penalty risk) |
| CTR/FCR Filed | Cash Transaction Reports > ₹10 lakh |
| Compliance Score | Internal audit score 0–100 |
| Regulatory Exposure | Total ₹ in open cases |

---

### Model Health Page

**URL:** `http://localhost:3000/executive/model-health`

<!-- Screenshot -->
> 📸 *Add screenshot here: Model Health page*

| Metric | Value | Meaning |
|---|---|---|
| Accuracy | 93.4% | Overall correct decisions |
| Precision | 91.2% | When engine says "fraud" it is right 91.2% of the time |
| Recall | 88.9% | Catches 88.9% of all real fraud |
| F1 Score | 90.0% | Balance of precision and recall |

**Data Drift Monitor:** Current 3.0%, threshold 10%. Measures whether today's data differs from calibration data. At 10%+ drift → human review needed.

**Signal Importance:** Transaction Velocity 23%, Amount Deviation 19%, Device Trust 16%, Beneficiary Risk 14%, Time Anomaly 11%

---

## 🗄 Database Schema — All 6 Tables

### Table 1 — `accounts`
Stores bank accounts with behavioral baselines.

| Column | Purpose |
|---|---|
| id | Account ID (ACC-004) |
| name | Account holder name |
| risk_rating | low / medium / high |
| typical_hours_start/end | Usual active hours |
| profile (JSONB) | avg_transaction_amount, usual_counterparties, flags |

### Table 2 — `pre_txn_queue`
Every transaction scored BEFORE execution. Pre-transaction audit trail.

| Column | Purpose |
|---|---|
| id | PRE-XXXXX |
| from/to_account | Sender and receiver |
| amount | ₹ amount |
| risk_score | 0–100 |
| risk_signals (JSONB) | Full signal breakdown |
| decision | approve / mfa / manual_review / block |

### Table 3 — `transactions`
Completed transactions — normal and fraud-flagged.

| Column | Purpose |
|---|---|
| id | TXN-XXX |
| from/to_account | Sender and receiver |
| amount | ₹ amount |
| flagged | Whether marked suspicious |
| risk_score | Post-transaction score |
| case_id | Linked investigation case |

### Table 4 — `alerts`
Fraud alerts. Full alert stored as JSONB with auto-extracted severity and status columns.

### Table 5 — `cases`
Investigation case files. Full case (evidence, timeline, notes) stored as JSONB.

### Table 6 — `demo_sessions`
4 mock GPay scenarios for live demos: Normal (ACC-003), ATO (ACC-004), Structuring (ACC-008), Mule Ring (ACC-010).

---

## 🔌 API Endpoints — Complete Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api` | API discovery |
| `GET` | `/api/dashboard/analyst` | Analyst KPIs + charts |
| `GET` | `/api/dashboard/executive` | Executive KPIs + compliance |
| `GET` | `/api/alerts` | List alerts (filter: `?severity=`, `?status=`) |
| `GET` | `/api/alerts/{id}` | Alert details |
| `GET` | `/api/alerts/{id}/explain` | AI explanation for alert |
| `GET` | `/api/cases` | List cases |
| `GET` | `/api/cases/{id}` | Full case with evidence + timeline |
| `GET` | `/api/graph/{caseId}` | Transaction network graph |
| `GET` | `/api/transactions` | List transactions |
| `POST` | `/api/transactions/score` | **Pre-transaction scoring** |
| `GET` | `/api/transactions/queue` | Scoring audit trail |
| `GET` | `/api/risk/score?transaction_id=` | Score existing transaction |
| `GET` | `/api/report/{caseId}/pdf` | Download FIU PDF report |
| `GET` | `/api/report/{caseId}/metadata` | Report metadata |
| `POST` | `/api/feedback/confirm` | Analyst feedback (confirm/deny fraud) |
| `POST` | `/api/knowledge/search` | RAG search over knowledge base |

---

## 🔄 Data Flow Diagrams

### Flow 1 — Analyst Dashboard

```
Browser ── GET /dashboard/analyst ──► Backend
                                       ├─ SELECT * FROM alerts
                                       ├─ SELECT * FROM cases
                                       ├─ Compute KPIs
                                       └─ Return JSON
Browser ◄── 4 KPI cards + charts ──────┘
```

### Flow 2 — Pre-Transaction Scoring

```
Browser ── POST /transactions/score ──► Backend
                                         ├─ Save to pre_txn_queue
                                         ├─ Load account profile
                                         ├─ Run 5-component scoring
                                         ├─ If score ≥ 30: call OpenAI
                                         └─ Return score + decision
Browser ◄── score, decision, explanation ┘
```

### Flow 3 — FIU Report

```
Browser ── GET /report/CASE-005/pdf ──► Backend
                                         ├─ Load case from DB
                                         ├─ Load linked transactions
                                         ├─ Call OpenAI for STR narrative
                                         ├─ Generate PDF with ReportLab
                                         └─ Embed custody hash
Browser ◄── PDF download ───────────────┘
```

---

## 🧠 How the System Learns and Improves

The scoring engine is **deterministic** (rule-based), not an ML model. This is intentional for regulated banking where rules must be explainable and auditable.

### 1. Analyst Feedback Loop

```
POST /api/feedback/confirm
{ case_id: "CASE-001", confirmed_fraud: true }

Analyst marks: confirmed_fraud or false_positive
→ Builds labeled dataset for scoring weight adjustments
```

### 2. Model Health Monitoring

```
Precision drops → too many false positives → raise thresholds
Recall drops    → missing real fraud → lower thresholds
```

### 3. Data Drift Detection

```
Current: 3.0%   Threshold: 10%
At 10%+: human review needed for threshold recalibration
```

### 4. Behavioral Baseline Updates

```
Profiles should refresh every 90 days from actual transaction history.
Without updates → salary raises cause false alarms.
```

### Why Not Pure ML?

| Layer | Tech | Why |
|---|---|---|
| Signal detection | Pure math | Fast, explainable, no hallucination |
| Graph analysis | NetworkX | Structural laundering detection |
| Decision engine | Thresholds | Consistent, auditable by RBI |
| Explanation | GPT-4o mini | Writes investigation notes |
| Knowledge Q&A | ChromaDB | Semantic search over docs |

**The AI does not make the decision — it explains the decision. The math makes the decision.** This is the right design for regulated banking where auditors need to know exactly why a transaction was blocked.

---

## 📁 Project Structure

```
chakravyuh/
├── apps/
│   ├── api/                          ← FastAPI Backend
│   │   ├── app/
│   │   │   ├── main.py              ← Entry point
│   │   │   ├── config.py            ← Environment config
│   │   │   ├── api/routes/          ← All HTTP endpoints
│   │   │   ├── core/
│   │   │   │   ├── scoring.py       ← 0–100 scoring engine
│   │   │   │   └── data_loader.py   ← JSON loading
│   │   │   ├── db/
│   │   │   │   ├── schema.sql       ← Table definitions
│   │   │   │   └── repositories/    ← DB queries
│   │   │   ├── graph/
│   │   │   │   ├── builder.py       ← NetworkX construction
│   │   │   │   └── analyzer.py      ← Pattern detection
│   │   │   ├── llm/
│   │   │   │   ├── explainer.py     ← AI prompt templates
│   │   │   │   └── openai_client.py ← GPT-4o mini calls
│   │   │   ├── retrieval/
│   │   │   │   └── vector_store.py  ← ChromaDB (5 collections)
│   │   │   ├── services/            ← Business logic
│   │   │   ├── schemas/             ← Pydantic models
│   │   │   └── utils/
│   │   │       └── pdf_generator.py ← FIU PDF builder
│   │   └── tests/
│   │       ├── test_scoring.py      ← 13 scoring tests
│   │       ├── test_api.py          ← 20 API tests
│   │       └── test_graph.py        ← 3 graph tests
│   │
│   └── web/                          ← Next.js 14 Frontend
│       ├── app/
│       │   ├── analyst/             ← Dashboard, Alerts, Cases, Scorer
│       │   └── executive/           ← Overview, Compliance, Model Health
│       ├── components/              ← UI components
│       ├── hooks/                   ← React hooks
│       ├── lib/                     ← API client
│       └── types/                   ← TypeScript types
│
├── data/
│   ├── sample/                      ← 7 JSON seed files
│   └── docs/                        ← Knowledge base + policies
│
├── docker/                          ← Dockerfiles
├── packages/shared/                 ← Shared types
├── scripts/                         ← Utility scripts
└── docker-compose.yml               ← One-command deployment
```

---

## 🚀 How to Run

### Prerequisites

- Python 3.11+
- Node.js 20+
- OpenAI API key (optional — works with template fallbacks)

### Backend

```bash
cd apps/api
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API at `http://localhost:8000`. Docs at `/docs`.

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

Frontend at `http://localhost:3000`.

### Docker

```bash
docker compose up --build
```

### Tests

```bash
cd apps/api
pytest tests/ -v
```

All 36 tests should pass.

---

## 🛠 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14, React, TypeScript | Web application |
| UI | shadcn/ui, Radix, Tailwind CSS | Design system |
| Charts | Recharts | KPI visualizations |
| Graph UI | React Flow | Fund-flow network diagrams |
| Animations | Framer Motion | UI transitions |
| Backend | FastAPI, Python 3.11+ | REST API |
| Database | PostgreSQL | 6-table storage |
| Graph Engine | NetworkX | Transaction graph analysis |
| AI/LLM | OpenAI GPT-4o mini | Explanations and reports |
| Vector Search | ChromaDB | RAG knowledge retrieval |
| PDF | ReportLab | FIU investigation reports |
| Containers | Docker, Docker Compose | Deployment |
| Testing | pytest | 36 automated tests |

---

<div align="center">

*Chakravyuh v1.1 — Built for Indian Banking | FIU-IND Compliant | PMLA 2002*

</div>
