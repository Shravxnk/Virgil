# 🔍 Virgil — Post-Transaction Detection: Full Walkthrough

> The money has already moved. Here is exactly what happens next — step by step.
> For comparison, see `EXPLAINED.md` Section 4 for the pre-transaction walkthrough.

---

## The Scenario

Priya Sharma's ₹2,50,000 transfer somehow got through.

This can happen when:
- Pre-transaction scoring was not wired up to the payment gateway yet
- The fraud was subtle enough to score below the block threshold at that moment
- The fraudster used a slow, multi-day layering scheme that only becomes visible after the fact

The money has moved. Now the post-transaction engine takes over.

---

## STEP 1 — Transaction Lands in the Database

The payment network confirms the transfer completed. It gets written to the `transactions` table in PostgreSQL:

```json
{
  "id": "TXN-X9Y8Z7",
  "from_account": "ACC-004",
  "to_account": "ACC-015",
  "amount": 250000,
  "currency": "INR",
  "txn_type": "RTGS",
  "channel": "mobile_app",
  "timestamp": "2026-04-03T02:14:00Z",
  "flagged": false,
  "risk_score": null
}
```

At this point: no alert, no case, no analyst is watching.

---

## STEP 2 — Scoring Engine Re-runs With Full Graph Data

```
GET /api/risk/score?transaction_id=TXN-X9Y8Z7
```

This is the same scoring engine as pre-transaction — but now it has something it didn't have before: the **full transaction history of all connected accounts**.

The engine calls `_check_graph_signals("ACC-004", all_transactions)`:

```
Looks at every account ACC-004 has ever sent to.
For each of those accounts, checks: did money flow BACK to ACC-004?

  ACC-004 → ACC-015  ✓
  ACC-015 → ACC-017  ✓
  ACC-017 → ACC-004  ✓  ← circular! money returned to origin

  circular_transfers = True
  hop_count          = 3
  layering_detected  = True  (circular AND hop_count ≥ 3)
```

**This is why graph score was 0 pre-transaction and 25 post-transaction. The money hadn't moved yet, so there was no circular path to find.**

---

## STEP 3 — Score Is Now Much Higher

```
Pre-transaction score (before money moved):
  amount_score    = 23   (14.2× baseline)
  time_score      = 13   (2 AM)
  device_score    = 15   (unknown device)
  benef_score     = 16   (risky recipient)
  graph_score     =  0   ← no data yet
                    ──
  Total           = 67   → manual_review

Post-transaction score (money has moved, graph visible):
  amount_score    = 23   (same)
  time_score      = 13   (same)
  device_score    = 15   (same)
  benef_score     = 16   (same)
  graph_score     = 25   ← circular + layering + 3 hops = 27, capped at 25
                    ──
  Total           = 92   → BLOCK (case opened)
```

The same transaction that scored 67 pre-transaction scores 92 post-transaction — because now the system can see the full picture.

---

## STEP 4 — Alert Is Generated

A new record is written to the `alerts` table:

```json
{
  "id": "ALT-A4B5C6",
  "alert_type": "account_takeover",
  "severity": "critical",
  "status": "new",
  "account_id": "ACC-004",
  "account_name": "Priya Sharma",
  "amount": 250000,
  "risk_score": 92,
  "reason_codes": [
    "AMOUNT_DEVIATION_14.2X",
    "NEW_DEVICE",
    "FIRST_TIME_BENEFICIARY",
    "CIRCULAR_TRANSFERS",
    "LAYERING_DETECTED",
    "FLAG_PRIOR_INVESTIGATION"
  ],
  "timestamp": "2026-04-03T02:14:00Z"
}
```

Status is `"new"` — nobody has looked at it yet. It shows up in the analyst's alert queue.

---

## STEP 5 — OpenAI Writes the Investigation Briefing

```
GET /api/alerts/ALT-A4B5C6/explain
```

The system packages the full alert data and sends it to GPT-4o mini with this instruction:

> *"You are a Senior Fraud Analyst at an Indian bank's FIU. Review this alert. Write a thorough analyst-facing briefing covering: what triggered it, why it's suspicious, each reason code explained, who is at risk, a 3-step analyst checklist, and any PMLA / RBI obligations."*

GPT-4o mini responds:

```
"This critical alert on account ACC-004 (Priya Sharma) has triggered
6 risk signals including a confirmed circular fund flow through
ACC-015 → ACC-017 → ACC-004, indicating a mule network relay.

The originating transaction of ₹2,50,000 at 02:14 AM is 14.2× the
account's ₹17,600 baseline and was initiated from an unrecognized
device with trust score 15.

Analyst checklist:
  1. Freeze ACC-004, ACC-015, and ACC-017 immediately
  2. Call Priya Sharma on her registered mobile to confirm ATO
  3. File STR with FIU-IND within 7 working days (PMLA 2002,
     exposure ₹2.5L exceeds reporting threshold)"
```

This explanation is stored on the alert and displayed in the analyst console.

---

## STEP 6 — Multiple Alerts Are Grouped Into a Case

The system checks: are there other alerts touching the same accounts?

```
ALT-A4B5C6  →  ACC-004  (Priya — sender)
ALT-B7C8D9  →  ACC-015  (previous suspicious alert on recipient)
ALT-C1D2E3  →  ACC-017  (known mule account)

All three alerts share overlapping accounts → grouped into one Case.
```

```json
{
  "id": "CASE-2026-0047",
  "title": "Mule Network — ACC-004 / ACC-015 / ACC-017",
  "status": "open",
  "risk_score": 92,
  "total_exposure": 250000,
  "alert_ids": ["ALT-A4B5C6", "ALT-B7C8D9", "ALT-C1D2E3"],
  "transaction_ids": ["TXN-X9Y8Z7", "TXN-P3Q4R5"],
  "primary_account": "ACC-004",
  "assigned_to": "analyst@bank.com"
}
```

---

## STEP 7 — Fund-Flow Graph Is Built

```
GET /api/cases/CASE-2026-0047
```

`apps/api/app/graph/builder.py` builds a directed graph from the case's transaction IDs:

```
Nodes (accounts):
  ACC-004   label="Priya Sharma"   type=suspicious   risk=84
  ACC-015   label="Rahul Mehta"    type=suspicious   risk=71
  ACC-017   label="Aditi Singh"    type=suspicious   risk=78

Edges (money flows):
  ACC-004 → ACC-015   ₹2,50,000   suspicious=True
  ACC-015 → ACC-017   ₹1,90,000   suspicious=True
  ACC-017 → ACC-004   ₹80,000     suspicious=True   ← circular
```

`apps/api/app/graph/analyzer.py` then runs two analyses:

```
detect_suspicious_paths()
  → finds the circular path: ACC-004 → ACC-015 → ACC-017 → ACC-004
  → flags all edges in this path as suspicious=True

detect_clusters()
  → groups all 3 accounts into Cluster-1
  → avg cluster risk = (84 + 71 + 78) ÷ 3 = 77.7
```

This powers the visual network diagram on the case detail page in the analyst console.

---

## STEP 8 — Analyst Works the Case

The analyst opens `/analyst/cases/CASE-2026-0047` and sees:

```
┌─ Case Summary ──────────────────────────────────────────────────┐
│  Risk Score: 92  │  Exposure: ₹2,50,000  │  Status: Open        │
└─────────────────────────────────────────────────────────────────┘

┌─ AI Investigation Briefing ─────────────────────────────────────┐
│  "This critical alert on Priya Sharma (ACC-004) has triggered   │
│   6 risk signals including a confirmed circular fund flow..."   │
└─────────────────────────────────────────────────────────────────┘

┌─ Fund Flow Graph ───────────────────────────────────────────────┐
│                                                                  │
│   [ACC-004] ──₹2,50,000──▶ [ACC-015] ──₹1,90,000──▶ [ACC-017] │
│       ▲                                                    │     │
│       └────────────────────₹80,000─────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─ Linked Alerts (3) ─────────────────────────────────────────────┐
│  • ALT-A4B5C6   critical   ACC-004   ₹2,50,000                  │
│  • ALT-B7C8D9   high       ACC-015   ₹1,90,000                  │
│  • ALT-C1D2E3   high       ACC-017     ₹80,000                  │
└─────────────────────────────────────────────────────────────────┘
```

The analyst:
1. Reads the AI briefing
2. Reviews the fund-flow graph
3. Adds a note: *"Confirmed ATO. Priya called — did not initiate this transfer."*
4. Marks case as `confirmed_fraud`
5. Clicks **"Export Report"**

---

## STEP 9 — FIU-IND PDF Report Is Generated

```
POST /api/cases/CASE-2026-0047/report
```

`apps/api/app/utils/pdf_generator.py` + GPT-4o mini produce a formal PDF with 5 sections:

```
SECTION A — SUBJECT IDENTIFICATION
  Reporting entity: [Bank Name]
  Subject: Priya Sharma | ACC-004 | DOB | KYC ref no.

SECTION B — NATURE OF SUSPICIOUS ACTIVITY
  RTGS transfer of ₹2,50,000 on 2026-04-03 at 02:14 IST
  via mobile_app. Originating account ACC-004 transferred
  funds to ACC-015, which relayed to ACC-017, which returned
  ₹80,000 to ACC-004 — a confirmed circular round-trip.

SECTION C — INDICATORS OF SUSPICION
  • 14.2× amount deviation from ₹17,600 baseline
  • Circular fund flow across 3 accounts (mule network signature)
  • Unrecognized device, trust score 15
  • First-time beneficiary with prior_investigation flag
  • Transaction at 02:14 AM, 7 hours outside usual window

SECTION D — RISK ASSESSMENT
  Fraud type: Account Takeover → Mule Network Relay
  Risk score: 92 / 100
  Confidence: High

SECTION E — ACTIONS TAKEN
  ACC-004, ACC-015, ACC-017 frozen pending investigation.
  Account holder contacted — confirmed did not initiate transfer.
  STR being filed. Law enforcement escalation recommended.
```

A **custody hash** is embedded in the PDF to prove it has not been tampered with after generation.

---

## STEP 10 — STR Filed With FIU-IND

Under PMLA 2002, the bank has **7 working days** from detection to file the Suspicious Transaction Report with FIU-IND.

```
Day 1:  Alert generated, case opened
Day 3:  Analyst confirms fraud, generates PDF report
Day 5:  Compliance team reviews and signs off
Day 7:  STR submitted to FIU-IND portal  ✓

After submission:
  compliance_summary.sar_filed  += 1
  compliance_score               updates on Executive Dashboard
```

If the analyst misses the deadline:
- `compliance_score` drops
- Audit risk increases
- Flagged as red on the Executive Dashboard

---

## Pre-Transaction vs Post-Transaction — Side by Side

| | Pre-Transaction | Post-Transaction |
|---|---|---|
| **When** | Before money moves | After money moves |
| **Score (same transaction)** | 67 → manual review | 92 → block |
| **Why score is different** | Graph = 0 (no flow yet) | Graph = 25 (circular path visible) |
| **What gets created** | Entry in `pre_txn_queue` | Alert → Case → PDF report |
| **AI involvement** | Brief explanation on alert | Full investigation briefing + STR narrative |
| **Outcome** | Payment paused | Accounts frozen, regulator notified |
| **Speed** | < 200ms | Minutes to hours (analyst-driven) |
| **Regulatory trigger** | None | PMLA 2002 STR filing within 7 days |

---

## The Complete Flow, Visualized

```
Transaction completes
        │
        ▼
  Scoring engine re-runs
  (now has full graph data)
        │
        ├── Score < 30  → no alert, safe transaction
        │
        └── Score ≥ 30  → Alert created
                │
                ├── Score 30–59  → medium severity alert
                ├── Score 60–79  → high severity alert
                └── Score ≥ 80   → critical alert + case opened
                        │
                        ▼
                  OpenAI writes briefing
                        │
                        ▼
                  Graph is built
                  (nodes, edges, circular paths, clusters)
                        │
                        ▼
                  Analyst reviews in console
                  (briefing + graph + linked alerts)
                        │
                        ▼
                  Analyst confirms → Export PDF
                        │
                        ▼
                  FIU-IND STR filed within 7 days
                        │
                        ▼
                  Compliance dashboard updated ✓
```

---

*Virgil v1.1 — Post-transaction engine: `apps/api/app/services/risk_scoring.py`, `graph/`, `llm/explainer.py`, `utils/pdf_generator.py`*
