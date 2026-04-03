# Fraud Knowledge Base

## Money Laundering Indicators

### Layering Patterns
- Circular fund transfers through multiple intermediary accounts
- Rapid movement of funds through multiple jurisdictions
- Decreasing amounts at each hop (indicating extraction fees)
- Use of shell companies in offshore jurisdictions
- Transactions that lack clear economic purpose

### Structuring (Smurfing)
- Multiple transactions just below Currency Transaction Report (CTR) threshold ($10,000)
- Consistent sub-threshold amounts across multiple accounts
- Transactions made in rapid succession to different beneficiaries
- Use of multiple accounts or branches to avoid detection

### Integration
- Purchase of high-value assets (real estate, luxury goods)
- Investment in legitimate businesses
- Loan-back schemes using laundered funds as collateral

## Account Takeover (ATO) Indicators
- Login from new or unrecognized device
- IP address from unusual geographic location
- Activity during non-typical hours for the account holder
- Immediate high-value transfer after login
- Change of communication preferences before transaction
- Failed authentication attempts preceding successful login

## Synthetic Identity Fraud
- New account with thin or no credit history
- Rapid credit line utilization
- Address associated with multiple unrelated entities
- SSN or EIN inconsistencies
- No verifiable business operations at registered address
- Pattern of bust-out: build credit then extract maximum value

## Wire Fraud Red Flags
- Urgent wire requests with social engineering markers
- Change in beneficiary details close to transaction execution
- Requests that bypass normal approval workflows
- Transfers to first-time international beneficiaries
- Mismatch between stated purpose and transaction pattern

## Device Intelligence Signals
- New device fingerprint not previously associated with account
- VPN or proxy usage detected
- Device geolocation inconsistent with account holder's profile
- Multiple accounts accessed from same device
- Emulator or virtual machine detected

## Behavioral Analytics Baselines
- Transaction amount deviation: flag if > 3x standard deviation from 90-day mean
- Transaction frequency: flag if daily count exceeds 95th percentile
- Time-of-day anomaly: flag if outside 95% confidence interval of usual activity window
- Channel deviation: flag if new channel used for first time with high-value transaction
- Counterparty analysis: flag transfers to first-time beneficiaries above threshold

## Graph-Based Detection
- Cycle detection: identify circular fund flows (minimum 3 nodes)
- Community detection: identify clusters of accounts with unusually high interconnectivity
- Centrality analysis: flag accounts that serve as hubs in suspicious networks
- Temporal analysis: rapid sequential transfers through connected accounts
- Multi-hop tracing: follow fund flow across 3+ intermediary accounts

## Risk Scoring Framework
- Base score derived from transaction risk factors (0-40 points)
- Behavioral deviation component (0-25 points)
- Device and channel risk (0-15 points)
- Network/graph risk signals (0-20 points)
- Decision thresholds: Approve (<30), MFA (30-60), Manual Review (60-80), Block (>80)
