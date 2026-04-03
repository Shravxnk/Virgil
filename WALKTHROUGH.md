# 🛡️ Chakravyuh — Complete System Walkthrough

> **For:** Product demos, onboarding, and non-technical stakeholders  
> **What is Chakravyuh?** An AI-powered fraud intelligence system built for Indian banks. It detects fraud **before** a transaction happens (real-time block/approve) and **after** it happens (case investigation, FIU report generation).

---

## 📋 Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Home / Landing Page](#2-home--landing-page)
3. [Analyst Console](#3-analyst-console)
   - [Dashboard](#31-analyst-dashboard)
   - [Alert Inbox](#32-alert-inbox)
   - [Cases](#33-investigation-cases)
   - [Live Scorer (Pre-Transaction)](#34-live-scorer--pre-transaction)
4. [Executive Dashboard](#4-executive-dashboard)
   - [Overview](#41-executive-overview)
   - [Compliance](#42-compliance-page)
   - [Model Health](#43-model-health-page)
5. [Database Tables — What Lives Where](#5-database-tables--what-lives-where)
6. [API Endpoints — Every Route Explained](#6-api-endpoints--every-route-explained)
7. [Data Flow — How Everything Connects](#7-data-flow--how-everything-connects)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                           │
│                                                             │
│   localhost:3000  (Next.js 14 — React frontend)            │
│                                                             │
│   Home Page ──► Analyst Console ──► Executive Dashboard    │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTP API calls (fetch)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND  localhost:8000                        │
│              FastAPI (Python)                               │
│                                                             │
│  /api/dashboard/analyst    /api/dashboard/executive        │
│  /api/alerts               /api/cases                      │
│  /api/graph/:caseId        /api/transactions/score         │
│  /api/report/:caseId/pdf   /api/risk/score                 │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌─────────────┐ ┌──────────┐ ┌────────────────┐
   │ PostgreSQL  │ │ OpenAI   │ │ ChromaDB       │
   │ localhost   │ │ GPT-4o   │ │ Vector Store   │
   │ :5432       │ │ mini     │ │ (Knowledge Q&A)│
   │             │ │          │ │                │
   │ 6 tables    │ │ AI text  │ │ Fraud patterns │
   └─────────────┘ └──────────┘ └────────────────┘
```

**In plain English:**
- The **browser** (frontend) shows the pretty screens
- The **backend** does all the logic: scoring, analysis, AI explanations
- **PostgreSQL** is the main database holding all real data
- **OpenAI** writes the human-readable explanations that analysts see
- **ChromaDB** is a specialised AI search engine for fraud knowledge documents

---

## 2. Home / Landing Page

**URL:** `http://localhost:3000`

```
┌──────────────────────────────────────────────────────┐
│  🛡️ Chakravyuh                    [Analyst Console]  │
│                                   [Executive Dashboard│
├──────────────────────────────────────────────────────┤
│                                                      │
│        AI-Powered Fraud Intelligence System          │
│         for Indian Banking — v1.1                    │
│                                                      │
│  ┌─────────┐  ┌─────────────┐                       │
│  │ Analyst │  │  Executive  │                       │
│  │ Console │  │  Dashboard  │                       │
│  └─────────┘  └─────────────┘                       │
│                                                      │
│  ⚡ Pre-Transaction    🔍 Post-Transaction           │
│  Decisioning          Investigation                  │
│                                                      │
│  🕸️ Graph-Based       🤖 AI Explanation             │
│  Fund-Flow Analysis   Layer                          │
│                                                      │
│  📄 Regulatory        📊 Executive                  │
│  Report Export        Intelligence                   │
└──────────────────────────────────────────────────────┘
```

### What each feature card means:

| Feature Card | What it does |
|---|---|
| **⚡ Pre-Transaction Decisioning** | Scores a transaction in milliseconds BEFORE money moves. Decision: Approve / MFA / Manual Review / Block |
| **🔍 Post-Transaction Investigation** | After a transaction completes, analysts can investigate it, build a case, add evidence, write notes |
| **🕸️ Graph-Based Fund-Flow Analysis** | Draws a network map showing how money hopped between accounts — catches money laundering rings |
| **🤖 AI Explanation Layer** | GPT-4o mini reads all the fraud signals and writes a plain-English briefing for the analyst |
| **📄 Regulatory Report Export** | One-click PDF generation of a proper FIU-IND STR (Suspicious Transaction Report) |
| **📊 Executive Intelligence** | KPI dashboard for the bank's senior management — fraud totals, model health, compliance score |

### Where this page lives in code:
- **File:** `apps/web/app/page.tsx`
- **Data source:** Hardcoded landing page — no API calls, no database

---

## 3. Analyst Console

The Analyst Console is for the **bank's fraud investigation team** — the people who sit and review suspicious transactions day-to-day.

```
┌─────────────────────────────────────────────┐
│  🛡️ Chakravyuh        INVESTIGATION         │
│  Analyst Console                            │
│  ─────────────────                          │
│  🏠 Dashboard         ◄── Your home screen │
│  🔔 Alert Inbox       ◄── All fraud alerts  │
│  📁 Cases             ◄── Full investigations│
│  ⚡ Live Scorer       ◄── Pre-txn testing   │
│  ─────────────────                          │
│  📊 Executive View    ◄── Switch to mgmt    │
└─────────────────────────────────────────────┘
```

---

### 3.1 Analyst Dashboard

**URL:** `http://localhost:3000/analyst`  
**API Call:** `GET /api/dashboard/analyst`

```
┌─────────────────────────────────────────────────────────────────┐
│  Analyst Dashboard                                              │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│  Total       │  Critical    │  Pending     │  Resolved         │
│  Alerts      │  Alerts      │  Review      │  Today            │
│    10        │     6        │     7        │     0             │
│  ↑12% week  │  Immediate!  │  In queue    │  Closed today     │
├──────────────┴──────────────┴──────────────┴───────────────────┤
│                                                                 │
│  Daily Alert Trend (14 days)    │  Risk Score Distribution      │
│  ┌─────────────────────────┐    │  ┌───────────────────────┐    │
│  │ ~~~~red=alerts~~        │    │  │ 🟢  🟢  🟡  🟠  🔴  │    │
│  │ ~~~~green=resolved~~    │    │  │0-20 21-40 41-60 61-80 81+│  │
│  └─────────────────────────┘    │  └───────────────────────┘    │
│                                                                 │
│  Recent Alerts (top 5)          │  Active Cases                 │
│  ┌─────────────────────────┐    │  ┌───────────────────────┐    │
│  │ ALT-001 CRITICAL ₹2.1L  │    │  │ CASE-001 Score 87     │    │
│  │ ALT-002 HIGH ₹85K       │    │  │ CASE-002 Score 76     │    │
│  │ ALT-003 HIGH ₹1.2L      │    │  │ CASE-005 Score 92     │    │
│  └─────────────────────────┘    │  └───────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

#### 🔢 The 4 KPI Cards (Top Row)

| Card | What it shows | Where data comes from |
|---|---|---|
| **Total Alerts** | Count of ALL alerts in the system | `SELECT COUNT(*) FROM alerts` (PostgreSQL) |
| **Critical Alerts** | Alerts where severity = "critical" | `SELECT data FROM alerts` → filter `severity == "critical"` |
| **Pending Review** | Alerts where status is "new" or "open" — nobody has looked at them yet | Filter `status IN ("new", "open")` |
| **Resolved Today** | Alerts closed on today's date | Filter `status == "resolved"` AND `timestamp starts with today's date` |

**Backend code:** `apps/api/app/services/dashboard_service.py` → `get_analyst_dashboard()`

---

#### 📈 Daily Alert Trend Chart

```
Alerts per day (last 14 days)

10 │    •
 8 │   / \
 6 │  /   \    •
 4 │ /     \  / \
 2 │/       \/   \___
 0 └──────────────────
   Mar 20        Apr 3
   🔴 = New alerts triggered that day
   🟢 = Alerts resolved/closed that day
```

**What it tells you:** Is the fraud load going up or down this week? Are analysts resolving alerts faster than new ones arrive?

**Where data comes from:**
1. Backend reads all alerts from the `alerts` table in PostgreSQL
2. Groups them by their `timestamp` field (first 10 characters = `YYYY-MM-DD`)
3. Builds a 14-day window rolling backwards from today
4. For each day: counts total alerts AND counts resolved alerts separately
5. Returns JSON array like: `[{date: "2026-03-21", alerts: 3, resolved: 1}, ...]`

**Formula:**
```python
# For each of the last 14 days:
daily[date]["alerts"] += 1          # every alert with that timestamp
daily[date]["resolved"] += 1        # only if status == "resolved"
```

---

#### 📊 Risk Score Distribution Chart

```
How risky are our alerts?

8 │  ██
6 │  ██       ██
4 │  ██  ██   ██  ██
2 │  ██  ██   ██  ██  ██
  └──────────────────────
   0-20 21-40 41-60 61-80 81-100
   🟢 Safe  🟡 Watch  🟠 High  🔴 Critical
```

**What it tells you:** Most alerts should cluster in the low-risk end. If you see a spike in 81-100, something serious is happening.

**Where data comes from:**
1. Backend reads all alerts from PostgreSQL
2. Reads the `risk_score` field of each alert (a number 0–100)
3. Buckets them: 0-20, 21-40, 41-60, 61-80, 81-100
4. Returns count per bucket

**Formula:**
```python
if score <= 20:  buckets["0-20"] += 1
elif score <= 40: buckets["21-40"] += 1
elif score <= 60: buckets["41-60"] += 1
elif score <= 80: buckets["61-80"] += 1
else:             buckets["81-100"] += 1
```

---

#### 🔔 Recent Alerts Panel

Shows the **5 most recent alerts** sorted by timestamp (newest first).

Each row shows:
- **Risk Score number** (coloured: 🟢<30, 🟡 30-60, 🟠 60-80, 🔴 80+)
- Alert ID (e.g. `ALT-001`)
- Severity badge: Critical / High / Medium / Low
- Status badge: New / Investigating / Escalated / Resolved
- Title of the alert
- Account name + Amount + Alert type

**Where data comes from:** Same PostgreSQL `alerts` query, just top 5 sorted by timestamp DESC.

---

#### 📁 Cases Table Panel

Shows all open investigation cases.

Each row shows:
- Case ID (e.g. `CASE-001`)
- Case title
- Status (open / investigating / escalated / resolved)
- Risk score
- Assigned analyst

**Where data comes from:** `GET /api/cases` → reads `cases` table in PostgreSQL

---

### 3.2 Alert Inbox

**URL:** `http://localhost:3000/analyst/alerts`  
**API Call:** `GET /api/alerts?severity=critical&status=new`

```
┌─────────────────────────────────────────────────────────────────┐
│  Alert Inbox                                                    │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│ 🔍 Search... │ Severity ▼   │ Status ▼     │                   │
├──────────────┴──────────────┴──────────────┴───────────────────┤
│                                                                 │
│  87  ALT-001  CRITICAL  NEW                                     │
│      Priya Sharma — Unusual International Transfer              │
│      HDFC Savings · ₹2,10,000 · cross_border_transfer           │
│      2026-03-15 02:23 AM                    [→ CASE-002]       │
│  ─────────────────────────────────────────────────────         │
│  76  ALT-002  HIGH  INVESTIGATING                               │
│      Vikram Nair — Multiple Failed Auth + Large Transfer        │
│      Axis Savings · ₹85,000 · account_takeover                  │
│  ─────────────────────────────────────────────────────         │
└─────────────────────────────────────────────────────────────────┘
```

#### Filters

Three live filters that re-query the API each time you change them:

| Filter | Options | How it works |
|---|---|---|
| **Search box** | Free text | Filters client-side on alert title, ID, account name |
| **Severity** | All / Critical / High / Medium / Low | Passes `?severity=critical` to the API → `WHERE severity = 'critical'` in PostgreSQL |
| **Status** | All / New / Investigating / Escalated / Resolved | Passes `?status=new` to the API → `WHERE status = 'new'` |

#### Alert Row Explained

```
┌────┬──────────────────────────────────────┬──────────────────┐
│ 87 │ ALT-001  CRITICAL  NEW               │ 15 Mar 02:23 AM  │
│    │ Priya Sharma - Unusual Transfer      │ → CASE-002       │
│    │ HDFC Savings · ₹2,10,000 · cross_bdr│                  │
└────┴──────────────────────────────────────┴──────────────────┘
  ▲                                              ▲
Risk score                               Links to case if
(0-100)                                  this alert was
coloured by                              escalated to a
severity                                 full investigation
```

#### Where alert data comes from:

```
PostgreSQL: alerts table
┌─────┬──────────────────────────────────────────────────────┐
│ id  │ data (JSONB blob)                                    │
├─────┼──────────────────────────────────────────────────────┤
│ALT-1│{                                                     │
│     │  "id": "ALT-001",                                    │
│     │  "title": "Unusual International Transfer",          │
│     │  "account_name": "Priya Sharma",                     │
│     │  "account_id": "ACC-004",                            │
│     │  "amount": 210000,                                   │
│     │  "risk_score": 87,                                   │
│     │  "severity": "critical",                             │
│     │  "status": "new",                                    │
│     │  "alert_type": "cross_border_transfer",              │
│     │  "timestamp": "2026-03-15T02:23:41Z",               │
│     │  "case_id": "CASE-002"                               │
│     │}                                                     │
└─────┴──────────────────────────────────────────────────────┘
The "severity" and "status" columns are auto-generated
from the JSONB data so PostgreSQL can filter fast.
```

---

### 3.3 Investigation Cases

**URL:** `http://localhost:3000/analyst/cases`  
**API Call:** `GET /api/cases`

```
┌──────────────────────────────────────────────────────────────┐
│  Investigation Cases                                         │
├──────────┬─────────────────────────┬────────┬───────┬───────┤
│ Case ID  │ Title                   │ Status │ Score │ Action│
├──────────┼─────────────────────────┼────────┼───────┼───────┤
│ CASE-001 │ Circular Transfer Ring  │ invest │  87   │ View  │
│ CASE-002 │ Priya Sharma ATO        │ escal  │  76   │ View  │
│ CASE-003 │ Suyash Structuring      │ open   │  72   │ View  │
│ CASE-004 │ Synthetic Identity      │ open   │  68   │ View  │
│ CASE-005 │ Mule Network Ring       │ invest │  92   │ View  │
└──────────┴─────────────────────────┴────────┴───────┴───────┘
```

Clicking **View** on a case opens the **Case Detail Page** at `/analyst/cases/CASE-005`

#### Case Detail Page includes:

1. **Case header** — Title, status badges, risk score, assigned analyst, total exposure
2. **Evidence tabs** — Behavioral / Device / Network analysis
3. **Transaction list** — Every transaction linked to this case
4. **Fund-flow graph** (network map) — who sent money to whom
5. **Timeline** — chronological log of all events in this case
6. **AI Summary** — GPT-4o mini generated investigation briefing
7. **Similar cases** — other historical cases that look like this one
8. **Export PDF** — generates the FIU-style STR report

#### Where case data comes from:

```
PostgreSQL: cases table
┌──────────┬──────────────────────────────────────────────────┐
│ id       │ data (JSONB blob)                                │
├──────────┼──────────────────────────────────────────────────┤
│ CASE-005 │ {                                                │
│          │   "id": "CASE-005",                             │
│          │   "title": "Multi-Account Mule Network",        │
│          │   "status": "investigating",                    │
│          │   "risk_score": 92,                             │
│          │   "total_exposure": 4750000,   ← ₹47.5 lakh    │
│          │   "primary_account": "ACC-010",                │
│          │   "alert_ids": ["ALT-008", "ALT-009"],          │
│          │   "transaction_ids": ["TXN-011","TXN-012",...], │
│          │   "evidence": {                                 │
│          │     "behavioral_analysis": {...},               │
│          │     "device_analysis": {...},                   │
│          │     "network_analysis": {                       │
│          │       "circular_transfers": true,               │
│          │       "hop_count": 5                           │
│          │     }                                           │
│          │   },                                            │
│          │   "timeline": [...],                            │
│          │   "notes": [...]                                │
│          │ }                                               │
└──────────┴──────────────────────────────────────────────────┘
```

#### The Fund-Flow Graph (Network Map)

**API Call:** `GET /api/graph/CASE-005`

```
        ACC-010
       (Aditi — Mule Leader)
       /     |      \
      ▼      ▼       ▼
  ACC-011  ACC-012  ACC-016
  (Mule 1) (Mule 2) (Mule 3)
      \       |      /
       ▼      ▼     ▼
        ACC-017
      (Cash Out)
```

- Each **circle** = a bank account
- Each **arrow** = a transaction (amount shown on hover)
- **Red circles** = flagged/suspicious accounts
- **Thick arrows** = large amount transfers

**How graph is built:**
1. Backend gets case's `transaction_ids` list
2. Loads those transactions from PostgreSQL
3. Builds a directed graph: `from_account → to_account` for each transaction
4. Runs NetworkX analysis: detects circular paths, calculates centrality scores
5. Returns JSON with nodes (accounts) + edges (transactions)

---

### 3.4 Live Scorer — Pre-Transaction

**URL:** `http://localhost:3000/analyst/transactions`  
**API Call:** `POST /api/transactions/score`

This is the **crown jewel** of the system — it shows fraud detection happening BEFORE money moves.

```
┌──────────────────────────────────┬─────────────────────────────┐
│  Transaction Details             │  Result                     │
│                                  │                             │
│  Quick Scenarios:                │  ┌─────────────────────┐   │
│  ✅ Normal transfer              │  │  🚫 BLOCKED          │   │
│  ⚠️ Large unusual transfer       │  │  Risk Score: 84/100  │   │
│  🚫 Mule network transfer        │  │  ─────────────────── │   │
│  🔐 ATO attempt                  │  │  ████████████ 84%    │   │
│  ─────────────────────           │  │  0──30──60──80──100  │   │
│  From Account: ACC-004           │  │  Approve MFA Rev Block│  │
│  To Account:   ACC-015           │  └─────────────────────┘   │
│  Amount: ₹2,50,000               │                             │
│  Type: RTGS                      │  Signal Breakdown:          │
│  Channel: Mobile App             │  Amount Anomaly   ████ 23/25│
│  Device: Unknown                 │  Time Anomaly     ██   8/15 │
│                                  │  Beneficiary Risk ███  14/20│
│  [⚡ Score Transaction]          │  Device Risk      ████ 15/15│
│                                  │                             │
│                                  │  Triggered Signals:         │
│                                  │  • AMOUNT_DEVIATION_14.2X   │
│                                  │  • NEW_DEVICE               │
│                                  │  • FIRST_TIME_BENEFICIARY   │
│                                  │                             │
│                                  │  🤖 AI Analyst Briefing:    │
│                                  │  "This transaction from     │
│                                  │  Priya Sharma (ACC-004)     │
│                                  │  exhibits 3 critical risk   │
│                                  │  signals..."                │
└──────────────────────────────────┴─────────────────────────────┘
```

#### How the Scoring Engine Works (Step by Step)

```
User submits: ACC-004 → ACC-015, ₹2,50,000, RTGS, Unknown device

Step 1: Load ACC-004's profile from PostgreSQL
        → avg_transaction_amount: ₹17,600
        → usual_hours: 9am-6pm
        → usual_counterparties: [ACC-001, ACC-007, ACC-011]

Step 2: Calculate Amount Anomaly
        ratio = 250000 / 17600 = 14.2x
        score = 23/25 points  ← VERY suspicious

Step 3: Calculate Time Anomaly
        Current time: 11pm IST
        Usual hours: 9am-6pm
        Distance = 5 hours outside window
        score = 8/15 points  ← suspicious

Step 4: Device Risk
        device_known = False (new/unknown device)
        score = 15/15 points  ← maximum risk

Step 5: Beneficiary Risk
        ACC-015 never received money from ACC-004 before
        ACC-015 has "prior_investigation" flag
        score = 14/20 points  ← high risk

Step 6: Graph Risk
        No circular patterns yet for this pair
        score = 0/25 points

TOTAL = 23 + 8 + 15 + 14 + 0 = 60/100
→ DECISION: manual_review (60-80 = manual review)
```

#### Decision Thresholds

| Score Range | Decision | What happens |
|---|---|---|
| 0 – 29 | ✅ **Approve** | Transaction goes through immediately |
| 30 – 59 | 📱 **MFA** | User gets OTP/biometric challenge |
| 60 – 79 | 👁️ **Manual Review** | Sent to analyst queue, transaction holds |
| 80 – 100 | 🚫 **Block** | Transaction rejected, alert created |

#### Where pre-transaction data is stored:

```
PostgreSQL: pre_txn_queue table
┌─────────────┬──────────┬──────────┬──────────┬──────────────┐
│ id          │ from_acc │ to_acc   │ amount   │ decision     │
├─────────────┼──────────┼──────────┼──────────┼──────────────┤
│ PRE-A1B2C3  │ ACC-004  │ ACC-015  │ 250000   │ manual_review│
│ PRE-D4E5F6  │ ACC-010  │ ACC-016  │ 499000   │ block        │
│ PRE-G7H8I9  │ ACC-003  │ ACC-001  │ 15000    │ approve      │
└─────────────┴──────────┴──────────┴──────────┴──────────────┘
Every transaction scored pre-execution is stored here with its
risk signals, decision, and timestamp for audit trail.
```

---

## 4. Executive Dashboard

The Executive Dashboard is for **senior management** — CFO, CRO, CEO. They don't investigate individual transactions. They need the big picture: *Is the bank safe? Is the model working? Are we compliant?*

```
┌─────────────────────────────────────────────┐
│  🛡️ Chakravyuh        MANAGEMENT            │
│  Executive Dashboard                        │
│  ─────────────────                          │
│  🏠 Overview         ◄── KPIs + charts      │
│  🛡️ Compliance       ◄── RBI/FIU-IND status │
│  📊 Model Health     ◄── AI model stats     │
│  ─────────────────                          │
│  🕵️ Analyst Console  ◄── Switch to ops      │
└─────────────────────────────────────────────┘
```

---

### 4.1 Executive Overview

**URL:** `http://localhost:3000/executive`  
**API Call:** `GET /api/dashboard/executive`

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Fraud        │ Active       │ Detection    │ False +ve    │ Avg.         │ Regulatory   │
│ Detected     │ Cases        │ Rate         │ Rate         │ Resolution   │ Risk         │
│ ₹11.9Cr      │     5        │  91.8%       │  8.2%        │ 112.8h       │ ₹1.4Cr       │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

#### All 6 KPI Cards — Source Explained

| Card | Formula | DB Source |
|---|---|---|
| **Fraud Detected** | `SUM(amount)` of all transactions where `flagged = TRUE` | `transactions` table, `WHERE flagged = TRUE` |
| **Active Cases** | Count of cases where status is NOT `resolved_fraud`, `resolved_legitimate`, or `closed` | `cases` table |
| **Detection Rate** | From `executive_metrics.json` model file (stable metric, reviewed quarterly) | JSON file |
| **False Positive Rate** | `resolved_legitimate / total_resolved` — cases that were flagged but turned out innocent | `cases` table: count by status |
| **Avg. Resolution** | Average hours between `case_opened` and `case_resolved` events in case timelines | `cases` table → `timeline` array |
| **Regulatory Risk** | `SUM(total_exposure)` of all cases with status `open`, `investigating`, or `escalated` | `cases` table |

---

#### 📈 Fraud Trend Chart (Line Chart)

```
Monthly fraud amounts (₹K units)

₹90K │ •
₹80K │  \
₹70K │   \
₹60K │    •
₹50K │     \
₹40K │      \
₹30K │ • — — •     ← prevented (green)
     └──────────────
       2026-03    04
   🔴 detected   🟢 prevented
```

**Where data comes from:**
1. Backend reads all `flagged = TRUE` transactions from PostgreSQL
2. Groups by month (`ts` column, first 7 chars = `YYYY-MM`)
3. Detected = sum of amount per month
4. Prevented = transactions with `status = 'blocked'` or `'rejected'` (pre-transaction blocks)
5. Returns last 6 months

---

#### 🍩 Cases by Status (Donut Chart)

**Where data comes from:**
- Backend counts cases from PostgreSQL grouped by `status` column
- `status` column is auto-generated from `data->>'status'` in PostgreSQL

```sql
-- What the query effectively does:
SELECT status, COUNT(*) FROM cases GROUP BY status
```

Returns: `[{status: "investigating", count: 2}, {status: "open", count: 2}, ...]`

---

#### 📊 Top Risk Categories (Horizontal Bar Chart)

**Where data comes from:**
1. Backend reads all alerts from PostgreSQL
2. Groups by `alert_type` field inside the JSONB `data` column
3. For each type: counts alerts AND sums transaction amounts
4. Returns top 6 types sorted by count

```python
for alert in all_alerts:
    category = alert["alert_type"]  # e.g. "mule_network"
    cat_counts[category] += 1
    cat_amounts[category] += alert["amount"]
```

Categories you'll see:
- `mule_network` — multiple accounts acting as money relay
- `circular_transfer` — money going in loops
- `account_takeover` — credential theft
- `structuring` — breaking up large amounts to avoid reporting
- `synthetic_identity` — fake person fraud

---

### 4.2 Compliance Page

**URL:** `http://localhost:3000/executive/compliance`  
**API Call:** `GET /api/dashboard/executive` (same endpoint, compliance data is inside it)

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Compliance Score: 88 / 100       Q1 2026               │
│  ████████████████░░░░  Compliant                            │
├──────────────┬──────────────┬─────────────────────────────┤
│ STR/SAR      │ STR/SAR      │ CTR/FCR                     │
│ Filed: 8     │ Pending: 2   │ Filed: 23                   │
├──────────────┴──────────────┴─────────────────────────────┤
│                                                             │
│ Regulatory Schedule         │  SAR Filing Progress         │
│ Last RBI Audit: Nov 2025    │  ████████░░  80% filed       │
│ Next Audit: May 2026        │  "8 of 10 STRs submitted"    │
│ Compliance Score: 88/100    │  RBI obligation: 7 days      │
│ Regulatory Exposure: ₹1.4L  │                              │
├─────────────────────────────┴──────────────────────────────┤
│ Risk Category Breakdown                                     │
│ ─────────────────────────────────────────────────────────  │
│ mule_network         4 cases  ₹18.5L  █████████ 40%        │
│ circular_transfer    3 cases  ₹12.1L  ██████    27%        │
│ account_takeover     2 cases  ₹8.3L   ████      18%        │
└─────────────────────────────────────────────────────────────┘
```

#### What each section means:

| Section | Meaning | RBI Relevance |
|---|---|---|
| **STR/SAR Filed** | Suspicious Transaction Reports actually submitted to FIU-IND | Required under PMLA 2002 within 7 working days of suspicion |
| **STR/SAR Pending** | Reports due but not yet filed | Late filing = regulatory penalty |
| **CTR/FCR Filed** | Cash Transaction Reports for transactions >₹10 lakh | Mandatory for large cash dealings |
| **Compliance Score** | Internal audit score 0-100 | Higher = lower RBI scrutiny risk |
| **Regulatory Exposure** | Total ₹ amount in open/under-investigation cases | If fraud is confirmed, this could become the bank's liability |

**Where data comes from:** All compliance fields come from `executive_metrics.json` file (updated quarterly after RBI audits). The Risk Category breakdown is live from the `alerts` PostgreSQL table.

---

### 4.3 Model Health Page

**URL:** `http://localhost:3000/executive/model-health`  
**API Call:** `GET /api/dashboard/executive`

This page answers: **"Is our AI fraud detector actually working well?"**

```
┌───────────────────────────────────────────────────────────────┐
│  🤖 Fraud Risk Scoring Engine   ✅ Operational               │
│  Rule-based + graph analysis pipeline. GPT-4o mini for AI.   │
│  Last validated: 15 Mar 2026        Next review: 15 Jun 2026 │
│  Data drift: 3.0% — within threshold                         │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│  Accuracy    │  Precision   │  Recall      │  F1 Score       │
│  93.4%       │  91.2%       │  88.9%       │  90.0%          │
├──────────────┴──────────────┴──────────────┴─────────────────┤
│                                                               │
│  Metric Balance (Radar)     │  Signal Importance (Bar)        │
│  ┌───────────────────┐      │  ┌──────────────────────────┐  │
│  │    Accuracy       │      │  │ Txn Velocity  ████ 23%   │  │
│  │   /        \      │      │  │ Amt Deviation ███  19%   │  │
│  │ F1        Prec    │      │  │ Device Trust  ██   16%   │  │
│  │   \        /      │      │  │ Benefic Risk  ██   14%   │  │
│  │    Recall         │      │  │ Time Anomaly  █    11%   │  │
│  └───────────────────┘      │  └──────────────────────────┘  │
├─────────────────────────────┴──────────────────────────────── │
│  Data Drift Monitor                │  Architecture Notes       │
│  Overall Drift: 3.0%               │  ✅ Rule-based scoring   │
│  ████░░░░░░  Threshold: 10%        │  ✅ NetworkX graph       │
│  "Within acceptable range"         │  ✅ GPT-4o mini AI      │
│                                    │  ✅ No black-box model   │
└────────────────────────────────────┴──────────────────────────┘
```

#### The 4 Metric Cards — Cricket Analogy

Think of the fraud engine as a fielder trying to catch fraudulent balls:

| Metric | Cricket analogy | What it means |
|---|---|---|
| **Accuracy 93.4%** | Overall batting average | Out of ALL decisions (block/approve), 93.4% were correct |
| **Precision 91.2%** | When you called "out" how often was it actually out? | When the engine says "fraud", it's right 91.2% of the time |
| **Recall 88.9%** | What % of all actual dismissals did you catch? | The engine catches 88.9% of all real fraud — misses ~11% |
| **F1 Score 90.0%** | Your overall fielding rating | Balance between precision and recall — 90% is excellent |

**Where data comes from:** `executive_metrics.json` → `model_health` object. Updated manually after model validation runs.

#### Radar Chart (Metric Balance)
Shows all 4 metrics on a diamond/spider chart. Ideally all 4 should be equal and large — a lopsided diamond means the model is better at some things than others.

#### Signal Importance Chart
Shows which fraud signals contribute most to the score:
- **Txn Velocity 23%** — how quickly transactions are happening
- **Amt Deviation 19%** — how far the amount is from normal
- **Device Trust 16%** — whether the device is known
- **Beneficiary Risk 14%** — how risky the recipient is
- **Time Anomaly 11%** — whether it's an unusual time

**Data source:** Hardcoded in `model-health/page.tsx` — these are the actual weights in the scoring engine (`apps/api/app/core/scoring.py`)

---

## 5. Database Tables — What Lives Where

```
PostgreSQL database: localhost:5432/postgres
```

### Table 1: `accounts`
Stores every bank account with behavioral baseline for anomaly scoring.

```
columns: id | name | account_type | kyc_tier | risk_rating 
       | monthly_avg_credit | monthly_avg_debit
       | typical_hours_start | typical_hours_end
       | city | state | profile (JSONB)

Example row:
  id: "ACC-004"
  name: "Priya Sharma"
  account_type: "savings"
  risk_rating: "high"
  typical_hours_start: 9
  typical_hours_end: 18
  profile: {"usual_counterparties": ["ACC-001"], "avg_transaction_amount": 17600}

Used by: Pre-transaction scoring engine to build behavioral baseline
```

### Table 2: `pre_txn_queue`
Every transaction scored BEFORE it executes. This is the pre-transaction audit trail.

```
columns: id | from_account | to_account | amount | currency 
       | txn_type | channel | device_id | device_known
       | ip_address | geo_location | upi_ref
       | risk_score | risk_signals (JSONB) | decision
       | scored_at | completed | created_at

Example row:
  id: "PRE-A1B2C3"
  from_account: "ACC-004"
  to_account: "ACC-015"
  amount: 250000
  decision: "block"
  risk_score: 84
  risk_signals: {"amount_anomaly": 23.1, "device_mismatch": true}

Used by: Live Scorer page, audit trail
```

### Table 3: `transactions`
Completed (executed) transactions — both normal and fraud-flagged.

```
columns: id | from_account | from_name | to_account | to_name
       | amount | currency | txn_type | channel | status
       | risk_score | flagged | pre_txn_id | case_id
       | post_analysis (JSONB) | ts | created_at

Example row:
  id: "TXN-011"
  from_account: "ACC-010"
  to_account: "ACC-016"
  amount: 499000
  flagged: true
  risk_score: 91
  case_id: "CASE-005"

Used by: Graph builder, FIU reports, Executive fraud total calculation
```

### Table 4: `alerts`
Fraud alerts generated by the system (post-transaction analysis).

```
columns: id | data (JSONB) | severity* | status* | created_at
         (* auto-generated from JSONB for fast filtering)

The entire alert object is stored as JSON in the "data" column.
PostgreSQL auto-extracts severity and status for WHERE clause filtering.

Used by: Alert Inbox, Analyst Dashboard KPIs, Executive risk categories
```

### Table 5: `cases`
Full investigation case files — each case groups related alerts + transactions.

```
columns: id | data (JSONB) | status* | risk_score* | created_at
         (* auto-generated from JSONB)

The entire case file (including timeline, evidence, notes) is stored as JSON.

Used by: Cases page, Case detail, Graph visualization, FIU PDF reports
```

### Table 6: `demo_sessions`
Four mock GPay phone sessions for live demos.

```
columns: session_id | phone_label | account_id | scenario 
       | status | last_txn_id | created_at | updated_at

Example rows:
  DEMO-PHONE-1: Rajesh Patel (ACC-003) — normal behavior
  DEMO-PHONE-2: Priya Sharma (ACC-004) — ATO scenario
  DEMO-PHONE-3: Suyash Sawant (ACC-008) — structuring scenario
  DEMO-PHONE-4: Aditi Borse Enterprises (ACC-010) — mule ring
```

---

## 6. API Endpoints — Every Route Explained

Base URL: `http://localhost:8000`

| Endpoint | Method | Used By | What it returns |
|---|---|---|---|
| `/health` | GET | Monitoring | `{"status": "healthy"}` |
| `/api/dashboard/analyst` | GET | Analyst Dashboard | KPIs + daily trend + score distribution + recent alerts |
| `/api/dashboard/executive` | GET | Executive Overview, Compliance, Model Health | All executive KPIs, fraud trend, cases by status, compliance summary |
| `/api/alerts` | GET | Alert Inbox | List of alerts with optional `?severity=` and `?status=` filters |
| `/api/alerts/{id}` | GET | Alert detail | Single alert full data |
| `/api/alerts/{id}/explain` | GET | Alert detail | GPT-4o mini explanation for the alert |
| `/api/cases` | GET | Cases page | List of investigation cases |
| `/api/cases/{id}` | GET | Case detail | Full case with evidence, timeline, transactions |
| `/api/graph/{caseId}` | GET | Case detail graph tab | Nodes and edges for fund-flow visualization |
| `/api/transactions/score` | POST | Live Scorer | Pre-transaction risk score + decision + AI explanation |
| `/api/transactions/queue` | GET | Audit / admin | All pre-transaction scoring history |
| `/api/risk/score` | GET | Legacy scoring | Score existing transaction by ID |
| `/api/report/{caseId}/pdf` | GET | Case detail | Download FIU-style PDF |
| `/api/report/{caseId}/metadata` | GET | Case detail | Report metadata without downloading PDF |
| `/api/feedback/confirm` | POST | Case detail | Analyst confirms/denies fraud finding |
| `/api/knowledge/search` | POST | Knowledge Q&A | Semantic search over fraud knowledge base |

---

## 7. Data Flow — How Everything Connects

### Flow 1: Analyst Opens Dashboard

```
Browser (React)                Backend (FastAPI)              Database
    │                               │                            │
    │── GET /api/dashboard/analyst ─►│                            │
    │                               │── SELECT data FROM alerts ─►│
    │                               │◄── 10 alert rows ──────────│
    │                               │                            │
    │                               │── SELECT data FROM cases ──►│
    │                               │◄── 5 case rows ────────────│
    │                               │                            │
    │                               │ [compute KPIs in Python]   │
    │                               │ total_alerts = 10          │
    │                               │ critical = 6               │
    │                               │ pending = 7                │
    │                               │ [build daily trend]        │
    │                               │ [build score buckets]      │
    │                               │                            │
    │◄── JSON response ─────────────│                            │
    │                               │                            │
    │ [React renders:               │                            │
    │  4 KPI cards                  │                            │
    │  Daily trend chart            │                            │
    │  Score distribution chart     │                            │
    │  Recent alerts list]          │                            │
```

### Flow 2: Live Transaction Scoring

```
Analyst types: ACC-004 → ACC-015, ₹2,50,000
Clicks "Score Transaction"

Browser ── POST /api/transactions/score ──► Backend
                                              │
                                    ┌─────────▼──────────┐
                                    │  1. Save to         │
                                    │  pre_txn_queue      │
                                    │  (PRE-XXXXX)        │
                                    └─────────┬──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │  2. Load ACC-004    │
                                    │  profile from DB    │
                                    │  avg_txn: ₹17,600  │
                                    └─────────┬──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │  3. Run scoring     │
                                    │  engine:            │
                                    │  amount: 23pts      │
                                    │  time: 8pts         │
                                    │  device: 15pts      │
                                    │  benef: 14pts       │
                                    │  TOTAL: 60 → MFA    │
                                    └─────────┬──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │  4. If score ≥ 30:  │
                                    │  Call OpenAI API    │
                                    │  → AI explanation   │
                                    └─────────┬──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │  5. Update          │
                                    │  pre_txn_queue      │
                                    │  with score +       │
                                    │  decision           │
                                    └─────────┬──────────┘
                                              │
Browser ◄── JSON: score=60, decision=mfa, explanation="..." ──┘

[React renders:
 Decision banner: 📱 STEP-UP MFA
 Score bar fills to 60%
 Signal breakdown bars
 Reason codes
 AI briefing text]
```

### Flow 3: FIU PDF Report Generation

```
Analyst clicks "Export PDF" on CASE-005

Browser ── GET /api/report/CASE-005/pdf ──► Backend
                                              │
                                    ┌─────────▼──────────┐
                                    │  Load CASE-005      │
                                    │  from PostgreSQL    │
                                    └─────────┬──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │  Load linked txns   │
                                    │  TXN-011, TXN-012   │
                                    │  from PostgreSQL    │
                                    └─────────┬──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │  Call OpenAI API    │
                                    │  with full case +   │
                                    │  transaction data   │
                                    │  → Write STR text   │
                                    │  in FIU-IND format  │
                                    └─────────┬──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │  Generate PDF with  │
                                    │  ReportLab:         │
                                    │  - Cover + meta     │
                                    │  - AI STR narrative │
                                    │  - Transaction table│
                                    │  - Evidence section │
                                    │  - Timeline         │
                                    │  - Custody hash     │
                                    └─────────┬──────────┘
                                              │
Browser ◄── PDF file download ───────────────┘
         filename: chakravyuh-report-CASE-005.pdf
```

---

## 📁 File Structure Quick Reference

```
chakravyuh/
├── apps/
│   ├── api/                     ← Python FastAPI Backend
│   │   └── app/
│   │       ├── main.py          ← App entry point, startup
│   │       ├── config.py        ← Environment variables
│   │       ├── api/routes/      ← All HTTP endpoints
│   │       │   ├── dashboard.py ← /api/dashboard/*
│   │       │   ├── alerts.py    ← /api/alerts/*
│   │       │   ├── cases.py     ← /api/cases/*
│   │       │   ├── graph.py     ← /api/graph/*
│   │       │   ├── transactions.py ← /api/transactions/*
│   │       │   ├── reports.py   ← /api/report/*
│   │       │   └── risk.py      ← /api/risk/score
│   │       ├── services/        ← Business logic
│   │       │   ├── dashboard_service.py ← KPI computation
│   │       │   ├── risk_scoring.py      ← Score engine wrapper
│   │       │   └── case_service.py      ← Case assembly
│   │       ├── core/
│   │       │   ├── scoring.py   ← The actual math: 0-100 score
│   │       │   └── data_loader.py ← JSON file cache
│   │       ├── db/
│   │       │   ├── schema.sql   ← PostgreSQL table definitions
│   │       │   └── repositories/ ← DB query functions
│   │       │       ├── alert_repo.py
│   │       │       ├── case_repo.py
│   │       │       └── transaction_repo.py
│   │       ├── graph/
│   │       │   ├── builder.py   ← NetworkX graph construction
│   │       │   └── analyzer.py  ← Circular/layering detection
│   │       └── llm/
│   │           ├── explainer.py      ← All AI prompt templates
│   │           └── openai_client.py  ← GPT-4o mini caller
│   │
│   └── web/                     ← Next.js 14 Frontend
│       ├── app/
│       │   ├── page.tsx         ← Home/Landing page
│       │   ├── analyst/
│       │   │   ├── page.tsx         ← Analyst Dashboard
│       │   │   ├── alerts/page.tsx  ← Alert Inbox
│       │   │   ├── cases/page.tsx   ← Cases list
│       │   │   └── transactions/page.tsx ← Live Scorer
│       │   └── executive/
│       │       ├── page.tsx              ← Executive Overview
│       │       ├── compliance/page.tsx   ← Compliance page
│       │       └── model-health/page.tsx ← Model Health
│       ├── components/
│       │   ├── dashboard/
│       │   │   ├── kpi-chart.tsx    ← All charts
│       │   │   ├── alert-inbox.tsx  ← Alert list widget
│       │   │   └── case-table.tsx   ← Cases table widget
│       │   └── layout/
│       │       └── sidebar.tsx      ← Navigation sidebar
│       └── lib/
│           └── api.ts           ← All frontend API calls
│
├── data/sample/                 ← JSON seed data
│   ├── alerts.json              ← 10 sample alerts
│   ├── cases.json               ← 5 sample cases
│   ├── transactions.json        ← 18 sample transactions
│   ├── user_profiles.json       ← 18 account profiles
│   └── executive_metrics.json   ← Model health + compliance
│
└── .env                         ← Environment variables
    OPENAI_API_KEY=sk-...
    DB_HOST=localhost
    DB_PASSWORD=C6h12o6@.
```

---

*Generated: April 3, 2026 | Chakravyuh v1.1 | Built for Indian Banking*
