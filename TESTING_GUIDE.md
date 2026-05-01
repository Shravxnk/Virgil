# Chakravyuh Testing Guide

Comprehensive guide for testing Chakravyuh's fraud detection system with pre-transaction and post-transaction analysis.

---

## Quick Start

### 1. Fresh Database Seed

The system comes with **40 test accounts** organized in tiers:

```bash
python scripts/seed_db.py
```

**Account Bifurcation:**
- **ACC-001 to ACC-010**: POST-transaction baseline (normal, predictable patterns)
- **ACC-011 to ACC-020**: Pre-transaction approval/MFA/review/block patterns
- **ACC-021 to ACC-030**: Circular transfer ring + layering detection network
- **ACC-031 to ACC-040**: Reserved for manual test scenarios

---

## Testing Workflows

### Test 1: Real-Time GPay Mock with Live Device Detection

**Goal:** Verify device name (iPhone, Pixel 7, SM-G998B) and geo-location propagate through to dashboard.

#### Steps:

1. **Open GPay Interface**
   ```
   https://chakravyuh-web-xxxx.onrender.com/gpay
   ```
   (On actual mobile device or desktop with mobile emulation)

2. **Device Detection**
   - Page shows detected device: "iPhone (iOS 17.4)" or "Pixel 7" etc.
   - Uses Client Hints API for real model names (Chrome/Edge Android)
   - Falls back to UA string parsing for Safari/iOS

3. **Fill Payment Form**
   - **Paying From**: ACC-016 (Faisal Trust Account - low risk, will APPROVE)
   - **Paying To**: ACC-011 (Ankit Approved Trades)
   - **Amount**: ₹500,000
   - **Method**: UPI
   - **Location**: Click "Allow" to capture coordinates

4. **Confirm & Score**
   - Click "Pay ₹500,000"
   - Review on confirm screen (shows device + location)
   - Click "Pay ₹500,000" to score

5. **Verify on Dashboard**
   - Open: `https://chakravyuh-web-xxxx.onrender.com/analyst/pre-txn-analytics`
   - **Expected**: Transaction appears with:
     - `📱 iPhone (iOS 17.4)` or your actual device
     - `📍 12.9716,77.5946` (sample coordinates)
     - Decision: `APPROVE` (green badge)
     - Score: ~15/100

---

### Test 2: MFA with Biometric Authentication

**Goal:** Test MFA flow with fingerprint/face recognition UI.

#### Steps:

1. **From GPay**, select accounts that trigger MFA:
   - **From**: ACC-012 (Bhavna MFA Required)
   - **To**: ACC-014 (Darpan Blocked Account - will trigger MFA)
   - **Amount**: ₹200,000

2. **On Result Screen**
   - Title: "Verify Identity"
   - Shows "Use your fingerprint or face to complete payment"

3. **Choose Authentication**
   - Click "👆 Fingerprint" OR "😊 Face Recognition"
   - Simulated scanning UI appears
   - Click "Simulate Fingerprint Match" or "Simulate Face Match"
   - 2-3 second simulation, then ✓ "Identity Verified"

4. **Complete Payment**
   - Click "Complete Payment"
   - Back to form, ready for new transaction
   - Device + location remain captured

---

### Test 3: Circular Transfer Ring Detection

**Goal:** Detect AML/CFT patterns: circular transfers (ACC-021 → 022 → 023 → 024 → 021).

#### Steps:

1. **Monitor Dashboard** for POST-transactions:
   - Open: `https://chakravyuh-web-xxxx.onrender.com/analyst`
   - Pre-seeded ~12 circular transactions exist in DB

2. **Expected Findings**
   - Case open: "Circular transfers detected"
   - Risk score: 90/100 (BLOCK)
   - All 4 accounts flagged in related cases

3. **Graph Analysis**
   - Click on a case to see graph/network view
   - All 4 nodes connected in ring
   - Hover over edges to see transaction flow

4. **Layering Pattern**
   - ACC-025 → 026 → 027 → 028 (multi-hop)
   - 2 layering cycles in DB
   - Risk scores: 85/100
   - Reason codes: `CIRCULAR_TRANSFERS`, `LAYERING_DETECTED`

---

### Test 4: Structuring Detection

**Goal:** Multiple small transactions to avoid ₹100k reporting threshold.

#### Steps:

1. **Manual Test via GPay**
   - **From**: ACC-029 (StructuringAcct_Low)
   - **To**: ACC-030, ACC-031, ACC-032, ACC-033 (rotate)
   - **Amount**: ₹95,000 each (just under threshold)
   - **Submit 4+ times** from same browser/device

2. **Expected On Dashboard**
   - Individual txns show risk 70/100 (MANUAL_REVIEW)
   - Analyst dashboard aggregates into a Case
   - Case title: "Pattern detected: Potential structuring"
   - Recommended action: Contact account holder

3. **Pre-seeded Data**
   - 12 structuring transactions already in DB
   - All flagged with same patterns

---

### Test 5: High-Risk Account Patterns

**Goal:** Test various pre-txn scoring thresholds.

| Account | Risk | Amount | Expected Decision |
|---------|------|--------|-------------------|
| ACC-011 | Low | 500K | APPROVE (score 10-20) |
| ACC-012 | Medium | 300K | MFA (score 35-50) |
| ACC-013 | Medium | 2M | MANUAL_REVIEW (score 65-75) |
| ACC-014 | High | 5M | BLOCK (score 85+) |
| ACC-016 | Low | 50K | APPROVE (score <10) |
| ACC-018 | High | 500K | BLOCK (score 80+) |

**Steps:**
1. Open GPay
2. Select accounts from table above
3. Submit from GPay
4. Verify decision on dashboard matches expected

---

### Test 6: Device Mismatch & Time Anomaly

**Goal:** Test non-behavioral signals (device + time-of-day).

#### Device Mismatch:

1. **From GPay** on Desktop (Chrome):
   - Device detected: "Windows PC"
   - **From**: ACC-019 (Ishan New Device)
   - **To**: ACC-020 (Jasmine Clean Account)
   - **Amount**: ₹300,000
   - **Time**: Normal hours (9 AM - 5 PM)

2. **Expected**
   - Decision: MFA (device mismatch adds ~8 points)
   - Score: 45-55/100
   - Reason codes: `NEW_DEVICE`, `DEVICE_MISMATCH`

#### Time Anomaly:

(Hard to test without simulating server time; skip unless needed)

---

### Test 7: Amount Deviation

**Goal:** Large amount relative to account baseline.

#### Steps:

1. **From GPay**:
   - **From**: ACC-006 (Neha Investments - baseline ₹300K)
   - **To**: ACC-005
   - **Amount**: ₹3,000,000 (10x baseline)

2. **Expected**
   - Decision: MANUAL_REVIEW or BLOCK
   - Score: 60-75/100
   - Reason codes: `AMOUNT_DEVIATION_10X`

---

## Database Structure

### Accounts Table

```
accounts
├── id              → ACC-001, ACC-011, ACC-021, ACC-031, …
├── name            → Rajesh Enterprises, …
├── account_type    → corporate_current, individual_salary, …
├── risk_rating     → low, medium, high
├── monthly_avg_credit → baseline for amount anomaly scoring
├── monthly_avg_debit  → baseline for amount anomaly scoring
├── typical_hours_start, typical_hours_end → 9, 18 (for time anomaly)
├── city            → Mumbai, Bangalore, …
├── profile         → JSONB (flexible, stores extra fields)
```

### Pre-Transaction Queue

```
pre_txn_queue
├── id              → PRE-ABC123DE (auto-generated)
├── from_account    → ACC-001
├── to_account      → ACC-011
├── amount          → 500000
├── txn_type        → UPI, NEFT, IMPS, RTGS
├── channel         → mobile, netbanking
├── device_id       → windows_pc
├── device_name     → iPhone (iOS 17.4)
├── geo_location    → 12.9716,77.5946 (latitude,longitude)
├── risk_score      → 0-100
├── decision        → pending, approve, mfa, manual_review, block
├── risk_signals    → JSONB
│   ├── amount_anomaly → 2.5 (ratio)
│   ├── time_anomaly → 0.2 (0-1)
│   ├── device_mismatch → false
│   ├── beneficiary_risk → 0.0
│   └── graph_risk → 0.0
├── scored_at       → ISO 8601 timestamp
├── created_at      → ISO 8601 timestamp
```

### Transactions Table (Completed)

```
transactions
├── id              → TXN-ABC123DE or UPI/NEFT txn ID
├── from_account    → ACC-001
├── to_account      → ACC-011
├── amount          → 500000
├── txn_type        → UPI, NEFT, IMPS, RTGS
├── channel         → mobile, netbanking
├── risk_score      → 0-100 (post-txn analysis)
├── flagged         → true/false
├── case_id         → CASE-ABC123 (if high-risk)
├── ts              → transaction timestamp
├── post_analysis   → JSONB (detailed scoring breakdown)
```

### Alerts & Cases

```
alerts
├── id              → ALT-ABC123
├── data            → JSONB (status, severity, risk_score, …)
├── severity        → critical, high, medium, low (generated column)
├── status          → investigating, resolved, false_positive
├── created_at

cases
├── id              → CASE-ABC123
├── data            → JSONB (status, risk_score, alert_ids, transaction_ids, …)
├── status          → open, investigating, resolved (generated column)
├── risk_score      → 0-100 (generated column)
├── created_at
```

---

## Real-Time Features

### Server-Sent Events (SSE)

**Endpoint**: `/api/events/stream`

**Broadcast Events**:
```json
{
  "type": "transaction_scored",
  "pre_txn_id": "PRE-ABC123",
  "from_account": "ACC-001",
  "to_account": "ACC-011",
  "amount": 500000,
  "device_name": "iPhone (iOS 17.4)",
  "geo_location": "12.9716,77.5946",
  "score": 25,
  "decision": "approve",
  "scored_at": "2026-05-01T10:30:00.000Z",
  "alert_id": null,
  "case_id": null
}
```

**Dashboard Subscriptions**:
- Pre-transaction analytics: Auto-refresh queue on `transaction_scored`
- Analyst main dashboard: Auto-refresh metrics on `transaction_scored`
- Real-time polling: 2s fallback + SSE for instant updates

---

## Scoring Rules

### Amount Anomaly (0-25 points)
```
If ratio ≤ 1.5x baseline:  0 pts
If ratio 1.5-3.0x:         5-11 pts
If ratio 3.0-8.0x:         11-21 pts
If ratio > 8.0x:           21-25 pts
```

### Time Anomaly (0-15 points)
```
If within typical hours (9-18): 0 pts
If 1-8 hrs outside range:       up to 15 pts
```

### Device Risk (0-15 points)
```
Unknown device:            +8 pts
Low trust score (<30):      +7 pts
Medium trust (<60):         +3 pts
High-risk IP:              +7 pts (capped at 15)
```

### Beneficiary Risk (0-20 points)
```
First-time beneficiary:    +3 pts
High-risk rating:          +8 pts
Flags (PEP, offshore, …):  +1-5 pts each
```

### Graph/Network Risk (0-25 points)
```
Circular transfers:        +10 pts
Layering detected:         +8 pts
Hop count ≥ 3:             +5 pts
Connected suspicious accts: +7 pts
```

### Decision Thresholds
```
Score 0-30:        APPROVE
Score 30-60:       MFA (step-up auth)
Score 60-80:       MANUAL_REVIEW
Score 80-100:      BLOCK
```

---

## Troubleshooting

### Device Name Shows "Unknown Device"

- **Cause**: Client Hints API not supported or UA parsing failed
- **Fix**: Use Chrome/Edge on Android for accurate model names (e.g., "Pixel 7")
- **Fallback**: iPhone/iPad on iOS, generic names on others

### Geolocation Not Captured

- **Cause**: Browser permission denied or timeout
- **Fix**: 
  - Allow location when prompted
  - Check browser permissions (Settings → Privacy)
  - Increase timeout in code if needed
- **Status**: Shows "Not captured yet" until allowed

### SSE Events Not Updating Dashboard

- **Cause**: Connection closed or EventSource not established
- **Fix**:
  - Check browser console for errors
  - Verify API URL via `NEXT_PUBLIC_API_URL` env var
  - 2s polling fallback still works
  - Try manual "Refresh now" button

### Transaction Not Appearing in Queue

- **Cause**: Account doesn't exist or duplicate from_account/to_account
- **Fix**:
  - Verify both accounts exist: `/api/accounts`
  - Can't send money to self (from_account == to_account)
  - Check API response for errors (422 = validation failure)

---

## Performance Notes

### Pre-transaction Scoring (< 100ms)

- Deterministic rules engine (no ML inference)
- Fast: amount ratio, time check, device flags, beneficiary risk, graph signals
- All thresholds pre-computed; no DB queries during scoring

### Dashboard Updates

- SSE: Instant (< 100ms)
- Polling: Every 2 seconds
- Combined: Best of both (instant + fallback)

### Large Datasets

- Pagination: `/api/transactions?limit=50&skip=0`
- Filtered views: `/api/transactions?flagged=true`
- Graph queries: Pre-computed on case creation

---

## Production Checklist

- [ ] 40 accounts seeded (`python scripts/seed_db.py`)
- [ ] Render DB connected (external PostgreSQL)
- [ ] `NEXT_PUBLIC_API_URL` set in Render dashboard
- [ ] SSE working (check `/api/events/stream`)
- [ ] Pre-txn analytics live (2s polling + SSE)
- [ ] GPay mock deployed (`/gpay` route)
- [ ] All CI tests passing (36/36 in GitHub Actions)
- [ ] Fingerprint/face MFA flows tested
- [ ] Device names captured (check pre-txn items)
- [ ] Geo-location captures working (check pre-txn items)
- [ ] Circular transfer detection live (case auto-creation)

---

## API Endpoints

### Accounts
```
GET  /api/accounts                 → List all accounts
GET  /api/accounts/{id}            → Get single account
```

### Pre-Transaction Scoring
```
POST /api/transactions/score       → Score & enqueue (main endpoint)
GET  /api/transactions/queue       → Fetch pre-txn queue
GET  /api/transactions/{id}/score/{score_id} → Detailed score
```

### Real-Time
```
GET  /api/events/stream            → SSE endpoint (persistent)
```

### Dashboard
```
GET  /api/transactions             → All transactions
GET  /api/transactions?flagged=true → Flagged only
GET  /api/alerts                   → All alerts
GET  /api/cases                    → All cases
```

---

## Support

For issues, refer to the [README.md](./README.md) or GitHub issues.
