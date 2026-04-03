# Reporting & Narrative Templates

## Alert Explanation Template

### Standard Alert Narrative
```
On {date}, a {alert_type} alert was generated for account {account_name} ({account_id})
involving a {transaction_type} transaction of {amount} {currency}.

The transaction was flagged because:
{reason_codes}

Risk Assessment:
- Overall Risk Score: {risk_score}/100
- Decision: {decision}
- Behavioral Deviation: {behavioral_deviation}
- Device Risk: {device_risk}
- Network Risk: {network_risk}

{additional_context}
```

## Case Summary Template

### Investigation Summary
```
CASE ID: {case_id}
STATUS: {status}
ASSIGNED TO: {analyst_name}
CREATED: {created_date}
LAST UPDATED: {updated_date}

SUMMARY:
{case_description}

KEY FINDINGS:
{findings}

RISK INDICATORS:
- Primary Risk Score: {risk_score}
- Total Exposure: {total_exposure}
- Connected Accounts: {connected_accounts}
- Alert Count: {alert_count}

RECOMMENDED ACTION:
{recommended_action}

ANALYST NOTES:
{notes}
```

## FIU Report Template

### Suspicious Activity Report Narrative
```
CONFIDENTIAL — FOR AUTHORIZED USE ONLY

FINANCIAL INTELLIGENCE UNIT — INVESTIGATION REPORT
Report ID: {report_id}
Generated: {generation_date}
Chain-of-Custody Hash: {custody_hash}

1. EXECUTIVE SUMMARY
{executive_summary}

2. SUBJECT INFORMATION
- Primary Subject: {primary_subject}
- Account(s): {accounts}
- Jurisdiction(s): {jurisdictions}

3. SUSPICIOUS ACTIVITY DESCRIPTION
{activity_description}

4. TRANSACTION DETAILS
{transaction_table}

5. TIMELINE OF EVENTS
{timeline}

6. NETWORK ANALYSIS
{network_description}
[Graph Reference: {graph_reference}]

7. EVIDENCE AND INDICATORS
{evidence_summary}

8. RISK ASSESSMENT
{risk_assessment}

9. SIMILAR HISTORICAL CASES
{similar_cases}

10. RECOMMENDED ACTIONS
{recommendations}

11. APPENDICES
A. Complete Transaction List
B. Network Visualization
C. Device and Access Logs
D. Behavioral Analysis Detail

PREPARED BY: {analyst_name}
REVIEWED BY: {reviewer_name}
CLASSIFICATION: CONFIDENTIAL
```

## Executive Summary Template

### Monthly Risk Overview
```
CHAKRAVYUH — EXECUTIVE RISK BRIEFING
Period: {period}
Prepared: {date}

HEADLINE METRICS:
- Total Fraud Detected: {total_detected}
- Total Fraud Prevented: {total_prevented}
- Active Investigations: {active_cases}
- False Positive Rate: {fpr}
- Detection Rate: {detection_rate}
- Regulatory Exposure: {regulatory_exposure}

TREND ANALYSIS:
{trend_narrative}

MODEL PERFORMANCE:
{model_narrative}

COMPLIANCE STATUS:
{compliance_narrative}

TOP RISK CATEGORIES:
{risk_categories}

RECOMMENDED EXECUTIVE ACTIONS:
{recommendations}
```
