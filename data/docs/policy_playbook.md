# Policy & Action Playbook

## Decision Matrix

### Risk Score: 0-30 (Low Risk) — APPROVE
- No additional verification required
- Log transaction for batch review
- No customer notification needed

### Risk Score: 30-60 (Medium Risk) — MFA / STEP-UP
- Trigger step-up authentication (OTP, biometric, security question)
- Allow transaction to proceed upon successful verification
- Flag for next-day review if amount exceeds $50,000
- Send customer notification of authentication request

### Risk Score: 60-80 (High Risk) — MANUAL REVIEW
- Hold transaction pending analyst review
- Assign to available analyst within 15 minutes
- Notify customer of temporary hold with estimated resolution time
- Analyst must disposition within 4 hours
- If no disposition in 4 hours, auto-escalate to senior analyst

### Risk Score: 80-100 (Critical Risk) — BLOCK
- Block transaction immediately
- Generate alert and create case automatically
- Notify fraud operations team
- Freeze outbound transactions on account
- Contact customer through verified channel within 1 hour
- File preliminary SAR if indicators warrant

## Analyst Actions

### Freeze Account
- Prerequisite: Risk score ≥ 60 OR confirmed unauthorized access
- Effect: All outbound transactions blocked; inbound accepted
- Duration: 72 hours initial; renewable with supervisor approval
- Customer notification: Required within 24 hours
- Documentation: Freeze reason, supporting evidence, approver

### Escalate Case
- Prerequisite: Complex case requiring senior expertise OR regulatory implications
- Target: Senior Analyst, BSA Officer, or Compliance depending on type
- SLA: Escalated cases must be acknowledged within 2 hours
- Documentation: Escalation reason, preliminary findings, recommended action

### Add to Watchlist
- Prerequisite: Suspicious activity but insufficient evidence for immediate action
- Effect: Enhanced monitoring, lower alert thresholds
- Duration: 90 days default; extendable
- Review: Monthly review of watchlisted accounts
- Documentation: Watchlist reason, monitoring parameters

### Confirm Fraud
- Prerequisite: Investigation complete, fraud confirmed
- Effect: Case closed as fraud, evidence package preserved
- Follow-up: SAR filing, customer remediation, account review
- Feedback: Update model training data and risk scores
- Documentation: Fraud type, total loss, recovery status, SAR reference

### Export Report (FIU Report)
- Prerequisites: Case investigation substantially complete
- Content: Case summary, transaction timeline, evidence, graph analysis
- Format: PDF with chain-of-custody hash
- Distribution: Internal use and regulatory filing
- Retention: 7 years minimum per BSA requirements

## Regulatory Requirements

### SAR Filing
- Trigger: Confirmed fraud ≥ $5,000 OR suspected ML activity of any amount
- Deadline: 30 days from initial detection; 60 days if ongoing investigation
- Content: FinCEN SAR form with narrative, supporting documentation
- Review: BSA Officer must review and approve before filing

### CTR Filing
- Trigger: Cash transactions ≥ $10,000 in aggregate per customer per day
- Deadline: 15 days from date of transaction
- Automated: System should auto-generate for qualifying transactions
- Structuring note: Multiple transactions designed to evade CTR are reportable

### Record Retention
- Transaction records: 5 years
- SAR filings: 5 years from filing date
- Investigation case files: 7 years
- Customer identification records: 5 years after account closure
