# 📐 Virgil — Every Formula, Simply Explained

> Plain English. No jargon. Every formula used in the system, what it does, and why.

Source file: `apps/api/app/core/scoring.py`, `graph/builder.py`, `graph/analyzer.py`, `services/dashboard_service.py`

---

## The Big Picture First

The system gives every transaction a score from 0 to 100.
Higher score = more suspicious.
The score decides what happens to the payment:

```
0  to 29  →  Let it through (approve)
30 to 59  →  Ask the customer to verify with OTP (MFA)
60 to 79  →  Freeze the payment, let an analyst decide (manual review)
80 to 100 →  Block it completely
```

The score is made up of 5 parts added together:

```
Total Score = Amount points + Time points + Device points + Beneficiary points + Graph points
              (max 25)        (max 15)       (max 15)        (max 20)              (max 25)
              ─────────────────────────────────────────────────────────────────────────────
                                                                           Grand total: max 100
```

---

## Formula 1 — How Much Is "Too Much"? (Amount Anomaly)

**Maximum: 25 points**

### What it does
Every account has a "normal" transaction amount. This formula measures how far the current transaction is from that normal.

### Step 1 — Find the ratio

```
ratio = this transaction's amount ÷ account's average amount

Example:
  Priya usually sends ₹17,600
  This transaction is ₹2,50,000

  ratio = 2,50,000 ÷ 17,600 = 14.2
  (meaning: this is 14.2 times her normal)
```

### Step 2 — Convert ratio to points (4 zones)

```
Zone 1:  ratio ≤ 1.5   →  0 points
         "Up to 50% more than normal — could be any month, no alarm"

Zone 2:  ratio 1.5 to 3.0
         points = 5 + (ratio − 1.5) × 4
         "Noticeable but not extreme. Ramps up steadily."
         At ratio = 1.5  →  5 points
         At ratio = 3.0  →  11 points

Zone 3:  ratio 3.0 to 8.0
         points = 11 + (ratio − 3.0) × 2
         "Clearly unusual. Slower ramp — beyond 3x we care less about exact degree."
         At ratio = 3.0  →  11 points
         At ratio = 8.0  →  21 points

Zone 4:  ratio > 8.0
         points = min(25,  21 + log₂(ratio − 7) × 3)
         "Wildly unusual. Use log so 15x and 50x don't score very differently — both are crazy."
         At ratio = 14.2  →  21 + log₂(7.2) × 3 = 21 + 2.85 × 3 = 29.5 → capped at 25
```

### Why not just a straight line?
Because the difference between 2× and 3× your normal is meaningful. But the difference between 30× and 50× your normal is basically the same — both are obviously suspicious. The log curve reflects that: it grows fast at first, then slows down.

---

## Formula 2 — Wrong Time of Day? (Time Anomaly)

**Maximum: 15 points**

### What it does
Every account has usual hours (like 9 AM to 6 PM). This formula checks how far outside those hours the transaction is.

### Step 1 — Find the distance from usual hours

```
distance = how many hours away from the nearest edge of the window

Example:
  Usual hours: 9 AM to 6 PM
  Transaction: 2 AM

  Distance from 9 AM = |2 − 9| = 7 hours
  Distance from 6 PM = |2 − 18| = 16 hours
  Take the smaller: distance = 7 hours
```

### Step 2 — Normalize to 0–1

```
anomaly_degree = min(1.0,  distance ÷ 8)

  7 ÷ 8 = 0.875
  (means: 87.5% of maximum weirdness)
```

### Step 3 — Multiply by max points

```
points = anomaly_degree × 15

  0.875 × 15 = 13.1 ≈ 13 points
```

### Why divide by 8?
8 hours is the reference for "completely outside your normal". If you're a 9-to-5 person and you transact at 1 AM, that's 8 hours away — maximum weirdness. Anything further than 8 hours gets capped at 1.0 (100% anomalous).

---

## Formula 3 — Trusted Device? (Device Risk)

**Maximum: 15 points**

### What it does
Adds up points based on 3 independent signals about the device being used.

### The points table

```
Signal                              Points
─────────────────────────────────────────
Device has never been seen before   +8
Device trust score < 30             +7
Device trust score 30 to 59         +3
Device trust score ≥ 60             +0
IP address is medium-risk           +3
IP address is high-risk             +7
─────────────────────────────────────────
Total (capped at 15)
```

### Example

```
New device (never seen)  → +8
Trust score = 15 (< 30)  → +7
IP risk = low             → +0

Total = 15 points (at cap)
```

### Why 8 points for a new device?
The most common sign of Account Takeover (ATO) fraud is that the fraudster is using a device the real customer has never used. A new device alone should make the system nervous — 8 out of 15 maximum reflects that.

---

## Formula 4 — Who's Receiving the Money? (Beneficiary Risk)

**Maximum: 20 points**

### What it does
Adds up points based on what is known about the account receiving the money.

### The points table

```
Signal                              Points
─────────────────────────────────────────
First time ever sending to them     +3
Recipient risk rating = medium      +4
Recipient risk rating = high        +8
Flag: prior_investigation           +5
Flag: high_risk_jurisdiction        +4
Flag: shell_company_indicators      +4
Flag: offshore_jurisdiction         +3
Flag: pep_connected (political)     +2
Any other unknown flag              +1
─────────────────────────────────────────
Total (capped at 20)
```

### Example

```
First time sending               →  +3
Recipient rated "high" risk      →  +8
Flag: prior_investigation        →  +5

Total = 16 points
```

### Also outputs a risk level (0.0 to 1.0)

```
risk_level = points ÷ 20

  16 ÷ 20 = 0.80  (this gets passed to the AI explainer)
```

---

## Formula 5 — Is There a Laundering Pattern? (Graph Risk)

**Maximum: 25 points**

### What it does
Looks at the network of money flows and adds points if it finds laundering patterns.

### The points table

```
Signal                              Points
─────────────────────────────────────────
Circular transfer found             +10
  (money went A→B→C→A — round trip)

Layering detected                   +8
  (money deliberately split and re-routed)

Hop count ≥ 3                       +2 per hop above 2, max +5
  (money passed through 3+ accounts)

Suspicious connected accounts       +2.5 per account, max +7
─────────────────────────────────────────
Total (capped at 25)
```

### The hop formula written out

```
hop_points = min(5,  (hop_count − 2) × 2)

Examples:
  3 hops → min(5, 1×2) = 2 points
  4 hops → min(5, 2×2) = 4 points
  5 hops → min(5, 3×2) = 5 points  ← hits cap
  6 hops → min(5, 4×2) = 5 points  ← still 5
```

### The suspicious connections formula

```
connection_points = min(7,  count × 2.5)

Examples:
  1 connection → 2.5 points
  2 connections → 5.0 points
  3 connections → 7.0 points  ← hits cap
```

### Example (mule network with everything firing)

```
Circular transfer found   → +10
Layering detected         → +8
4 hops                    → +4
2 suspicious connections  → +5

Total = 27 → capped at 25 points
```

### Note on pre-transaction
Before a payment goes through, this score is usually 0 — there's no money flow yet, so there's no graph to analyze. This component activates fully in post-transaction analysis.

---

## Formula 6 — Adding It All Up (Final Score)

```
Score = amount_points + time_points + device_points + beneficiary_points + graph_points

Then clamp: Score = min(100, max(0, Score))
```

The `min/max` clamp just makes sure the score can never go below 0 or above 100, no matter what.

### The decision thresholds

```
Score < 30   →  approve        (low risk, let it through)
30 ≤ score < 60  →  mfa        (medium risk, verify identity)
60 ≤ score < 80  →  manual_review  (high risk, human decides)
score ≥ 80   →  block          (very high risk, auto-reject)
```

### Full example — Priya Sharma

```
Amount  =  23 points  (14.2× her normal)
Time    =  13 points  (2 AM, 7 hours outside 9–6 window)
Device  =  15 points  (new device, trust score 15)
Beneficiary = 16 points  (first time, high risk, prior_investigation flag)
Graph   =   0 points  (pre-transaction, no flow yet)
            ──────
Total   =  67 points  →  manual_review
```

---

## Formula 7 — Node Risk Score (Graph Visualization)

**Used in:** `apps/api/app/graph/builder.py`

When the fund-flow graph is drawn on screen, each account node gets a risk score for its color (red = risky, grey = normal). Here's how that score is calculated:

```
Start at 20 points (every account gets a base score)

Add for risk rating:
  low    → +0
  medium → +15
  high   → +30

Add for flags on the account:
  prior_investigation     → +15
  shell_company_indicators → +12
  high_risk_jurisdiction  → +10
  thin_credit_file        → +8
  offshore_jurisdiction   → +8
  pep_connected           → +8
  new_account             → +5
  any other flag          → +3

Final node score = min(100, sum of above)
```

This is only used for visual coloring of the graph. It does not affect the transaction score.

---

## Formula 8 — Behavioral Mismatch (Summary Signal)

**Used in:** `apps/api/app/core/scoring.py` (returned in API response)

After scoring, the API also returns a "behavioral mismatch" number between 0 and 1. This is a normalized summary of how unusual the amount was:

```
behavioral_mismatch = min(1.0,  amount_ratio ÷ 10)

Examples:
  ratio = 2.0  →  2.0 ÷ 10 = 0.20  (mild mismatch)
  ratio = 5.0  →  5.0 ÷ 10 = 0.50  (moderate mismatch)
  ratio = 14.2 →  14.2 ÷ 10 = 1.0  (capped — extreme mismatch)
```

This is passed to the AI (GPT-4o mini) so the explanation can say things like "extreme behavioral mismatch" vs "mild deviation".

---

## Formula 9 — When to Generate a Reason Code for Time (Threshold)

**Used in:** `apps/api/app/core/scoring.py`

The system only adds "TIME_ANOMALY" to the reason codes list if the anomaly was meaningful:

```
emit TIME_ANOMALY reason code  if  anomaly_degree > 0.3

  0.3 × 8 hours = 2.4 hours

Meaning: only flag time as suspicious if the transaction
was more than 2.4 hours outside the normal window.

A transaction at 6:01 PM for a 9-to-6 person → 1 minute off
→ anomaly_degree = 0.002 → no reason code generated
→ no noise

A transaction at 2 AM for a 9-to-6 person → 7 hours off
→ anomaly_degree = 0.875 → reason code generated ✓
```

---

## Formula 10 — False Positive Rate (Executive Dashboard)

**Used in:** `apps/api/app/services/dashboard_service.py`

```
false_positive_rate = resolved_legitimate ÷ all_resolved_cases

Where:
  resolved_legitimate = cases that turned out to be innocent
  all_resolved_cases  = resolved_fraud + resolved_legitimate
```

A false positive is when the system flagged someone innocent. Lower is better. If this number creeps up, it means the scoring thresholds are too aggressive.

---

## Formula 11 — Average Case Resolution Time (Executive Dashboard)

**Used in:** `apps/api/app/services/dashboard_service.py`

```
For each closed case:
  time_to_resolve = case_closed_timestamp − case_opened_timestamp
  (converted to hours)

avg_resolution_time = sum of all times ÷ number of resolved cases
```

Measures how fast the analyst team is working through the backlog.

---

## Formula 12 — Prevented vs Detected Fraud (Fraud Trend Chart)

**Used in:** `apps/api/app/services/dashboard_service.py`

```
detected  = total amount on flagged transactions in that month
prevented = amount on transactions where status = "blocked" or "rejected"

If no blocked/rejected data exists, the system estimates:
  prevented ≈ detected × 0.35
  (assumes ~35% of detected fraud was stopped before money moved)
```

---

## Formula 13 — Cluster Average Risk (Graph Clustering)

**Used in:** `apps/api/app/graph/analyzer.py`

When the graph analyzer groups accounts into suspicious clusters, it gives each cluster a group risk score:

```
cluster_risk = sum of risk_score of all accounts in the cluster
               ÷ number of accounts in the cluster

(plain average / arithmetic mean)
```

Only clusters with 3 or more accounts are shown. A cluster of 2 accounts is just a normal sender-receiver pair.

---

## Summary — All 13 Formulas at a Glance

| # | Formula | Where used | Simple purpose |
|---|---|---|---|
| 1 | Amount anomaly (4-zone, log tail) | `scoring.py` | How far is this amount from normal? |
| 2 | Time anomaly (linear, 8hr reference) | `scoring.py` | How far outside usual hours? |
| 3 | Device risk (additive flags) | `scoring.py` | Is this a known trusted device? |
| 4 | Beneficiary risk (additive flags) | `scoring.py` | How risky is the recipient? |
| 5 | Graph risk (hop formula + circular) | `scoring.py` | Is there a laundering pattern? |
| 6 | Final score + decision thresholds | `scoring.py` | What is the overall verdict? |
| 7 | Node risk score (for graph colors) | `graph/builder.py` | How red should this node be? |
| 8 | Behavioral mismatch (0–1 signal) | `scoring.py` | Summary for AI explainer |
| 9 | Time reason code threshold (> 0.3) | `scoring.py` | When to mention time in the report |
| 10 | False positive rate | `dashboard_service.py` | How often is the system wrong? |
| 11 | Average resolution time | `dashboard_service.py` | How fast is the analyst team? |
| 12 | Prevented vs detected fraud | `dashboard_service.py` | How much money was actually saved? |
| 13 | Cluster average risk | `graph/analyzer.py` | How suspicious is this group? |

---

*Virgil v1.1 — Scoring engine: `apps/api/app/core/scoring.py`*
