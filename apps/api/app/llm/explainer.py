"""LLM-backed explanation and narration layer.

Uses OpenAI to generate:
- Alert explanations for analysts
- Case investigation summaries
- Executive risk briefings
- FIU report narratives
- Q&A over retrieved context

Falls back to template-based responses when the API key is not configured.
"""

from app.llm.openai_client import chat_completion

ALERT_EXPLANATION_SYSTEM = """You are a Senior Fraud Analyst at an Indian bank's Financial Intelligence Unit (FIU-IND).
You are reviewing a fraud alert and must write a thorough, analyst-facing investigation briefing.

Your explanation must include:
1. **What triggered this alert** — be specific about which signals breached thresholds
2. **Why it is suspicious** — explain the behavioural anomaly in plain language (e.g. "this account typically transacts ₹15,000 but this transaction is ₹2.1 lakh — 14x the baseline")
3. **Risk signal breakdown** — explain each reason code in human-readable terms
4. **Who is at risk** — identify the sending account, receiving account, and any network exposure
5. **What the analyst must do next** — give a specific 3-step investigation checklist (e.g. call account holder, freeze pending transactions, check linked accounts)
6. **Regulatory context** — note any applicable RBI/PMLA/FIU-IND obligations (e.g. STR filing if exposure > ₹10 lakh)

Use ₹ for currency. Be specific, professional, and actionable. Write in clear paragraphs — avoid bullet overload. Target 6-8 sentences minimum."""

CASE_SUMMARY_SYSTEM = """You are a Senior Fraud Investigator at an Indian bank's FIU preparing an internal case briefing.
You have access to the full case file including alert chain, transaction evidence, device analysis, and network graph data.

Your case summary must cover:
1. **Case overview** — what fraud pattern is suspected, how it was detected, total financial exposure in ₹
2. **Evidence chain** — walk through the key evidence (behavioural deviation, device anomalies, circular transfers, velocity)
3. **Fraud typology** — identify the specific fraud type (e.g. Account Takeover, Mule Network, Structuring, Identity Fraud)
4. **Network exposure** — flag any linked accounts or counterparties that may be co-conspirators
5. **Timeline of suspicious activity** — key moments in the fraud progression
6. **Risk assessment** — rate the confidence that this is genuine fraud (High/Medium/Low) with justification
7. **Recommended next steps** — specific actions: freeze accounts, file STR, escalate to LE, MFA challenge, etc.

Use ₹ for currency. Reference real account IDs and transaction IDs where available. Write 8-12 sentences, professional tone."""

EXECUTIVE_SUMMARY_SYSTEM = """You are the Chief Risk Officer's AI briefing assistant at a major Indian private-sector bank.
You generate concise executive risk intelligence memos for CXO-level readers.

Your briefing must cover:
1. **Current fraud exposure** — total ₹ at risk, trend vs prior period
2. **Model performance** — detection rate, false positive rate, and what they mean for operations
3. **Active case pipeline** — how many cases are open, critical ones to watch
4. **Regulatory standing** — any STR/CTR obligations outstanding, compliance posture
5. **Recommended executive actions** — 2-3 specific decisions the board/CISO/CRO should take this week

Use ₹ for currency. Keep it to 5-7 sentences. Executive tone — no jargon, no bullet lists, flowing prose."""

REPORT_NARRATIVE_SYSTEM = """You are a financial crime reporting specialist at an Indian bank, filing a Suspicious Transaction Report (STR)
with the Financial Intelligence Unit of India (FIU-IND) under the Prevention of Money Laundering Act (PMLA), 2002.

Write a formal, legally defensible STR narrative with the following sections:

**SECTION A — SUBJECT IDENTIFICATION**
Identify the reporting entity (bank), the subject account, account holder details.

**SECTION B — NATURE OF SUSPICIOUS ACTIVITY**
Describe the specific transactions and behaviours that triggered suspicion. Include dates, amounts in ₹, transaction types, channels (IMPS/NEFT/UPI/RTGS), and counterparty details.

**SECTION C — INDICATORS OF SUSPICION**
List and explain each typology indicator (e.g. structuring below ₹10L threshold, rapid velocity, round-amount transfers, new device, first-time beneficiary, circular fund flow).

**SECTION D — RISK ASSESSMENT**
State the fraud type suspected (e.g. Money Laundering, Account Takeover, Mule Network). Provide risk score and confidence level.

**SECTION E — ACTIONS TAKEN**
Describe actions already taken (account freeze, MFA challenge, escalation to LE) and recommended further actions.

Use formal RBI/FIU-IND report language. Reference the PMLA 2002 and RBI Master Circular on KYC/AML where appropriate.
Be precise about amounts (₹), dates, transaction IDs, and account IDs."""

QA_SYSTEM = """You are a fraud intelligence knowledge assistant at an Indian bank's FIU.
Answer questions using the provided context from the bank's fraud knowledge base, policy playbook, and historical case data.
Be precise, cite specific policies or patterns when relevant, and indicate when information is uncertain.
Reference RBI guidelines, PMLA 2002, and FIU-IND directives where applicable.
Keep responses concise and immediately actionable for analysts."""


def generate_alert_explanation(alert_data: dict) -> str:
    """Generate a detailed LLM-backed explanation for a fraud alert."""
    # Build enriched reason code descriptions
    reason_descriptions = {
        "AMOUNT_DEVIATION": "Transaction amount is significantly higher than the account's behavioural baseline",
        "TIME_ANOMALY": "Transaction occurred outside the account holder's usual active hours",
        "NEW_DEVICE": "Transaction was initiated from an unrecognised or low-trust device",
        "HIGH_RISK_IP": "Source IP address is associated with high-risk geography or proxy/VPN usage",
        "FIRST_TIME_BENEFICIARY": "Funds are being sent to a recipient this account has never transacted with before",
        "CIRCULAR_TRANSFERS": "Network graph shows funds returning to near-origin accounts (layering pattern)",
        "LAYERING_DETECTED": "Multi-hop fund movement consistent with money laundering layering stage",
        "FLAG_PRIOR_INVESTIGATION": "Beneficiary account has prior fraud investigation history",
        "FLAG_HIGH_RISK_JURISDICTION": "Beneficiary is in a high-risk regulatory jurisdiction",
        "FLAG_SHELL_COMPANY_INDICATORS": "Beneficiary shows indicators of shell company operations",
    }

    reason_codes = alert_data.get("reason_codes", [])
    reason_details = []
    for rc in reason_codes:
        desc = next(
            (v for k, v in reason_descriptions.items() if rc.startswith(k)),
            f"Triggered threshold: {rc}"
        )
        reason_details.append(f"• {rc}: {desc}")
    reason_text = "\n".join(reason_details) if reason_details else "No specific reason codes recorded."

    prompt = f"""FRAUD ALERT BRIEFING REQUEST

Alert ID: {alert_data.get('id', 'N/A')}
Alert Type: {alert_data.get('alert_type', 'unknown')}
Title: {alert_data.get('title', '')}

ACCOUNT DETAILS:
  Account: {alert_data.get('account_name', '')} [{alert_data.get('account_id', '')}]
  Transaction Amount: ₹{alert_data.get('amount', 0):,.0f} ({alert_data.get('currency', 'INR')})
  Timestamp: {alert_data.get('timestamp', '')}

RISK ASSESSMENT:
  Risk Score: {alert_data.get('risk_score', 0)}/100
  Severity: {alert_data.get('severity', 'unknown').upper()}
  Decision: {alert_data.get('decision', 'manual_review')}

DESCRIPTION: {alert_data.get('description', '')}

TRIGGERED REASON CODES:
{reason_text}

BEHAVIORAL SIGNALS:
  Amount Anomaly: {alert_data.get('amount_anomaly', 'N/A')}
  Behavioral Mismatch: {alert_data.get('behavioral_mismatch', 'N/A')}
  Device Mismatch: {alert_data.get('device_mismatch', False)}
  Time Anomaly: {alert_data.get('time_anomaly', 'N/A')}
  Beneficiary Risk: {alert_data.get('beneficiary_risk', 'N/A')}
  Graph/Network Risk: {alert_data.get('graph_risk', 'N/A')}

Write a detailed analyst briefing for this alert."""

    result = chat_completion(ALERT_EXPLANATION_SYSTEM, prompt, max_tokens=1200)
    if result:
        return result

    # Fallback
    amount_str = f"₹{alert_data.get('amount', 0):,.0f}"
    return (
        f"Alert {alert_data.get('id', 'N/A')}: {alert_data.get('title', 'Fraud alert')}. "
        f"This {alert_data.get('severity', 'high')}-severity alert was triggered on account "
        f"{alert_data.get('account_name', 'unknown')} ({alert_data.get('account_id', '')}) "
        f"for a transaction of {amount_str}. "
        f"Risk score: {alert_data.get('risk_score', 0)}/100. "
        f"Alert type: {alert_data.get('alert_type', 'suspicious activity')}. "
        f"Description: {alert_data.get('description', 'No additional details.')} "
        f"Triggered signals: {', '.join(reason_codes) or 'See alert details'}. "
        f"Recommended action: Investigate account activity, verify with account holder, "
        f"and consider escalation if confirmed fraudulent."
    )


def generate_case_summary(case_data: dict) -> str:
    """Generate a detailed LLM-backed investigation summary for a case."""
    evidence = case_data.get("evidence", {})
    ba = evidence.get("behavioral_analysis", {})
    da = evidence.get("device_analysis", {})
    na = evidence.get("network_analysis", {})

    timeline_events = case_data.get("timeline", [])
    timeline_str = "\n".join(
        f"  {e.get('timestamp', '')[:16]} [{e.get('event_type', '')}]: {e.get('description', '')}"
        for e in timeline_events[:8]
    ) or "No timeline data."

    notes_str = "; ".join(
        n.get("content", "") for n in case_data.get("notes", [])[:3]
    ) or "No analyst notes."

    alert_ids = ", ".join(case_data.get("alert_ids", [])[:5]) or "None"
    txn_ids = ", ".join(case_data.get("transaction_ids", [])[:5]) or "None"

    prompt = f"""CASE INVESTIGATION SUMMARY REQUEST

Case ID: {case_data.get('id', 'N/A')}
Title: {case_data.get('title', '')}
Status: {case_data.get('status', '')}
Assigned To: {case_data.get('assigned_to', 'Unassigned')}
Primary Account: {case_data.get('primary_account', 'N/A')}

FINANCIAL EXPOSURE:
  Total Exposure: ₹{case_data.get('total_exposure', 0):,.0f}
  Risk Score: {case_data.get('risk_score', 0)}/100
  Recommended Action: {case_data.get('recommended_action', 'N/A')}

CASE DESCRIPTION:
{case_data.get('description', 'No description.')}

LINKED EVIDENCE:
  Alert IDs: {alert_ids}
  Transaction IDs: {txn_ids}

BEHAVIORAL ANALYSIS:
  Amount Deviation: {ba.get('deviation', 'N/A')}x from baseline
  Baseline Avg Amount: ₹{ba.get('baseline_avg_amount', 0):,.0f}
  Current Amount: ₹{ba.get('current_amount', 0):,.0f}
  Time Anomaly: {ba.get('time_anomaly', False)}

DEVICE ANALYSIS:
  Known Device: {da.get('known_device', True)}
  Device Type: {da.get('device_type', 'N/A')}
  OS: {da.get('os', 'N/A')}
  IP Address: {da.get('ip_address', 'N/A')} [{da.get('ip_risk', 'low')} risk]
  Location: {da.get('geo_location', 'N/A')}

NETWORK ANALYSIS:
  Circular Transfers: {na.get('circular_transfers', False)}
  Hop Count: {na.get('hop_count', 0)}
  Connected Suspicious Accounts: {na.get('connected_suspicious_accounts', 0)}
  Layering Detected: {na.get('layering_detected', False)}

TIMELINE OF EVENTS:
{timeline_str}

ANALYST NOTES:
{notes_str}

Write a professional case investigation summary."""

    result = chat_completion(CASE_SUMMARY_SYSTEM, prompt, max_tokens=1400)
    if result:
        return result

    return (
        f"Investigation of {case_data.get('title', 'case')} (ID: {case_data.get('id', 'N/A')}) "
        f"reveals a risk score of {case_data.get('risk_score', 0)}/100 with total exposure of "
        f"₹{case_data.get('total_exposure', 0):,.0f}. "
        f"The case is currently {case_data.get('status', 'open')} and "
        f"{'shows circular fund transfers — a layering indicator. ' if na.get('circular_transfers') else ''}"
        f"{'An unknown device was used — possible account takeover. ' if not da.get('known_device', True) else ''}"
        f"Recommended action: {case_data.get('recommended_action', 'Further investigation required.')}."
    )


def generate_executive_summary(metrics: dict) -> str:
    """Generate an executive-level summary of fraud detection metrics."""
    prompt = f"""EXECUTIVE RISK BRIEFING REQUEST — {metrics.get('date', 'Current Period')}

FRAUD DETECTION METRICS:
  Total Fraud Detected: ₹{metrics.get('total_fraud_detected', 0):,.0f}
  Total Fraud Prevented (pre-txn blocks): ₹{metrics.get('total_fraud_prevented', metrics.get('total_fraud_detected', 0) * 0.35):,.0f}
  Active Cases Under Investigation: {metrics.get('active_cases', 0)}
  Detection Rate: {metrics.get('detection_rate', 0):.1%}
  False Positive Rate: {metrics.get('false_positive_rate', 0):.1%}
  Avg Case Resolution Time: {metrics.get('avg_resolution_time', 0):.1f} hours

MODEL PERFORMANCE:
  Accuracy: {metrics.get('model_accuracy', 0):.1%}
  Regulatory Exposure: ₹{metrics.get('regulatory_exposure', 0):,.0f}

Write a concise executive risk briefing memo."""

    result = chat_completion(EXECUTIVE_SUMMARY_SYSTEM, prompt, max_tokens=600)
    if result:
        return result

    return (
        f"The fraud detection system has identified ₹{metrics.get('total_fraud_detected', 0):,.0f} "
        f"in suspicious activity with a {metrics.get('detection_rate', 0):.1%} detection rate. "
        f"{metrics.get('active_cases', 0)} cases remain under active investigation. "
        f"Current regulatory exposure stands at ₹{metrics.get('regulatory_exposure', 0):,.0f}."
    )


def generate_report_narrative(case_data: dict, context: str = "") -> str:
    """Generate a professional FIU/STR report narrative with full RBI-compliant structure."""
    evidence = case_data.get("evidence", {})
    ba = evidence.get("behavioral_analysis", {})
    da = evidence.get("device_analysis", {})
    na = evidence.get("network_analysis", {})
    timeline = case_data.get("timeline", [])

    timeline_str = "\n".join(
        f"  {e.get('timestamp', '')[:16]}: {e.get('description', '')}"
        for e in timeline[:10]
    ) or "No timeline available."

    prompt = f"""STR/FIU REPORT NARRATIVE REQUEST

REPORTING ENTITY: Chakravyuh Bank (Fictional Entity for Demo)
REPORT TYPE: Suspicious Transaction Report (STR) under PMLA 2002 / FIU-IND

SUBJECT CASE:
  Case Reference: {case_data.get('id', 'N/A')}
  Primary Account: {case_data.get('primary_account', 'N/A')}
  Case Title: {case_data.get('title', '')}
  Total Exposure: ₹{case_data.get('total_exposure', 0):,.0f}
  Risk Score: {case_data.get('risk_score', 0)}/100
  Recommended Action: {case_data.get('recommended_action', 'N/A')}

TRANSACTION EVIDENCE:
{context}

BEHAVIORAL INDICATORS:
  Amount Deviation: {ba.get('deviation', 'N/A')}x from account baseline (₹{ba.get('baseline_avg_amount', 0):,.0f} baseline vs ₹{ba.get('current_amount', 0):,.0f} observed)
  Time Anomaly: {ba.get('time_anomaly', False)}

DEVICE & ACCESS INDICATORS:
  Known Device: {da.get('known_device', True)}
  Device Type/OS: {da.get('device_type', 'N/A')} / {da.get('os', 'N/A')}
  IP Risk: {da.get('ip_risk', 'low')}
  Geo-location: {da.get('geo_location', 'N/A')}

NETWORK / GRAPH INDICATORS:
  Circular Transfers: {na.get('circular_transfers', False)}
  Fund Layering Detected: {na.get('layering_detected', False)}
  Hop Count: {na.get('hop_count', 0)}
  Suspicious Connected Accounts: {na.get('connected_suspicious_accounts', 0)}

FRAUD TYPOLOGY SUSPECTED: {case_data.get('description', '')[:120]}

TIMELINE:
{timeline_str}

Write a complete, formal FIU-IND STR narrative covering all five sections (Subject Identification, Nature of Activity, Indicators of Suspicion, Risk Assessment, Actions Taken)."""

    result = chat_completion(REPORT_NARRATIVE_SYSTEM, prompt, max_tokens=2500)
    if result:
        return result

    return (
        f"This Suspicious Transaction Report documents activity by account {case_data.get('primary_account', 'N/A')} "
        f"in case {case_data.get('id', 'N/A')}: {case_data.get('title', '')}. "
        f"Total financial exposure: ₹{case_data.get('total_exposure', 0):,.0f}. "
        f"Risk score: {case_data.get('risk_score', 0)}/100. "
        f"Evidence: {context} "
        f"Recommended action: {case_data.get('recommended_action', 'further review')}."
    )


def answer_knowledge_query(query: str, context: str, collection: str) -> str:
    """Answer a question using retrieved context from the knowledge base."""
    prompt = f"""Context from {collection}:
{context}

Question: {query}

Answer the question using the provided context. Be specific and actionable.
Reference RBI guidelines, PMLA 2002, or FIU-IND directives if relevant."""

    result = chat_completion(QA_SYSTEM, prompt)
    if result:
        return result

    return f"Based on the {collection} knowledge base: please review the relevant documentation for guidance on '{query}'."


MANUAL_REVIEW_SUGGEST_SYSTEM = """You are an AI decision-support assistant for a bank fraud analyst in India.
A transaction has been flagged for MANUAL REVIEW — meaning the automated system is uncertain. Your job is to:

1. **Analyse all available signals** — amount anomaly ratio, device trust, time anomaly, beneficiary risk, network graph signals
2. **Give a clear AI suggestion**: APPROVE or REJECT — choose one, do not be vague
3. **Explain your reasoning in 4-6 sentences** — justify why you lean approve or reject based on the specific signal values
4. **State your confidence**: High / Medium / Low
5. **Give one specific action** the analyst should take to verify before finalising

Rules:
- REJECT suggestion if: score ≥ 70, device_mismatch = true AND amount_anomaly > 5x, OR beneficiary has prior_investigation flag
- APPROVE suggestion if: score < 65, single minor signal, no network risk, no device mismatch
- Always reference specific ₹ amounts and account IDs
- Use plain, professional English — avoid jargon overload"""


def generate_manual_review_suggestion(pre_txn: dict) -> dict:
    """Generate AI approve/reject suggestion with confidence for a manual_review transaction."""
    signals = pre_txn.get("risk_signals", {})
    score = pre_txn.get("risk_score", 0)

    prompt = f"""MANUAL REVIEW DECISION REQUEST

Transaction ID: {pre_txn.get('id', 'N/A')}
From Account: {pre_txn.get('from_account', 'N/A')}
To Account: {pre_txn.get('to_account', 'N/A')}
Amount: ₹{pre_txn.get('amount', 0):,.0f} {pre_txn.get('currency', 'INR')}
Type: {pre_txn.get('txn_type', 'N/A')}
Channel: {pre_txn.get('channel', 'N/A')}
Device Known: {pre_txn.get('device_known', False)}
Submitted: {pre_txn.get('created_at', 'N/A')}

RISK SCORE: {score}/100
THRESHOLDS: approve=0-29 | mfa=30-59 | manual_review=60-79 | block=80+

SIGNAL BREAKDOWN:
  Amount Anomaly: {signals.get('amount_anomaly', 'N/A')} (ratio vs account baseline)
  Time Anomaly: {signals.get('time_anomaly', 'N/A')} (0=normal hours, 1=max deviation)
  Device Mismatch: {signals.get('device_mismatch', False)}
  Beneficiary Risk: {signals.get('beneficiary_risk', 'N/A')} (0-1 scale)
  Graph/Network Risk: {signals.get('graph_risk', 'N/A')} (0-1 scale)

Based on these signals, provide:
1. Your suggestion: APPROVE or REJECT
2. Confidence: High / Medium / Low
3. A 4-6 sentence reasoning paragraph
4. One specific verification action for the analyst

Format your response exactly as:
SUGGESTION: [APPROVE or REJECT]
CONFIDENCE: [High / Medium / Low]
REASONING: [your paragraph]
ACTION: [one specific action]"""

    result = chat_completion(MANUAL_REVIEW_SUGGEST_SYSTEM, prompt, max_tokens=600)

    # Parse structured response
    suggestion = "REJECT"
    confidence = "Medium"
    reasoning = ""
    action = "Verify with account holder via registered mobile number before processing."

    if result:
        lines = result.strip().split("\n")
        for line in lines:
            if line.startswith("SUGGESTION:"):
                val = line.replace("SUGGESTION:", "").strip().upper()
                suggestion = "APPROVE" if "APPROVE" in val else "REJECT"
            elif line.startswith("CONFIDENCE:"):
                val = line.replace("CONFIDENCE:", "").strip()
                if "high" in val.lower():
                    confidence = "High"
                elif "low" in val.lower():
                    confidence = "Low"
                else:
                    confidence = "Medium"
            elif line.startswith("REASONING:"):
                reasoning = line.replace("REASONING:", "").strip()
            elif line.startswith("ACTION:"):
                action = line.replace("ACTION:", "").strip()
        if not reasoning:
            reasoning = result  # fallback: use full response as reasoning

    # Rule-based fallback if no AI available
    if not result:
        if score >= 70 or signals.get("device_mismatch") and signals.get("amount_anomaly", 0) > 5:
            suggestion = "REJECT"
            confidence = "High"
            reasoning = (
                f"This transaction scored {score}/100 with a device mismatch and "
                f"{signals.get('amount_anomaly', 0):.1f}x amount deviation. "
                f"Multiple high-risk signals present simultaneously indicate a likely fraud attempt. "
                f"Recommending rejection pending account holder verification."
            )
        else:
            suggestion = "APPROVE"
            confidence = "Medium"
            reasoning = (
                f"This transaction scored {score}/100 — borderline manual review territory. "
                f"Signal pattern shows limited risk: amount deviation of {signals.get('amount_anomaly', 0):.1f}x. "
                f"No strong network or device signals. Likely a legitimate but unusual transaction. "
                f"Recommend approval after a quick call to the account holder."
            )

    return {
        "suggestion": suggestion,
        "confidence": confidence,
        "reasoning": reasoning,
        "action": action,
        "score": score,
    }


SCENARIO_GENERATOR_SYSTEM = """You are a fraud scenario parameter generator for an Indian banking fraud detection system.

Given a plain-English description of a fraud scenario, you generate realistic transaction parameters as a JSON object.
The JSON must have exactly these fields:
{
  "from_account": string,   // account ID, e.g. "ACC-SCENARIO-01" — make it contextual
  "to_account": string,     // account ID, e.g. "ACC-MULE-99" — use names like ACC-MULE, ACC-SHELL, ACC-SAFE depending on context
  "amount": number,         // in INR (no ₹ symbol), e.g. 450000 for ₹4.5 lakh
  "txn_type": string,       // one of: UPI, NEFT, RTGS, IMPS — match the scenario
  "channel": string,        // one of: mobile, net_banking, branch, atm
  "device_known": boolean,  // true = trusted registered device, false = unknown/new device
  "ip_address": string,     // use 185.220.x.x for high-risk/suspicious, 103.21.x.x or 122.x.x.x for normal
  "geo_location": string,   // Indian city name
  "narrative": string       // 2-3 sentences explaining why this specific scenario is suspicious and what fraud pattern it represents
}

Rules:
- For fraud / suspicious scenarios: set device_known=false, use 185.x.x.x IP, use large amounts
- For normal / approved scenarios: set device_known=true, use 103.x.x.x IP, normal amounts
- Use RTGS for >₹2 lakh, IMPS or UPI for smaller amounts, NEFT for payroll-style
- Return ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON"""


def generate_scenario_from_description(description: str) -> dict:
    """Use OpenAI to generate realistic transaction parameters from a free-text fraud scenario description."""
    import json as _json

    prompt = f"Generate transaction parameters for this scenario:\n\n{description}"
    result = chat_completion(SCENARIO_GENERATOR_SYSTEM, prompt, max_tokens=500)

    if result:
        cleaned = result.strip()
        # Strip markdown code fences if present
        if cleaned.startswith("```"):
            parts = cleaned.split("```")
            cleaned = parts[1] if len(parts) > 1 else cleaned
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        try:
            data = _json.loads(cleaned.strip())
            # Ensure required fields have defaults
            data.setdefault("from_account", "ACC-SCENARIO-01")
            data.setdefault("to_account", "ACC-SCENARIO-02")
            data.setdefault("amount", 500000)
            data.setdefault("txn_type", "UPI")
            data.setdefault("channel", "mobile")
            data.setdefault("device_known", False)
            data.setdefault("ip_address", "185.220.101.55")
            data.setdefault("geo_location", "Mumbai")
            data.setdefault("narrative", description[:250])
            return data
        except Exception:
            pass

    # Rule-based fallback (no OpenAI key configured)
    desc_lower = description.lower()
    is_fraud = any(w in desc_lower for w in ["fraud", "suspicious", "unknown", "mule", "takeover", "launder", "block", "fake", "stolen", "hack"])
    is_large = any(w in desc_lower for w in ["large", "crore", "lakh", "million", "huge", "big", "high"])
    return {
        "from_account": "ACC-SCENARIO-01",
        "to_account": "ACC-MULE-99" if is_fraud else "ACC-SAFE-01",
        "amount": 2500000 if is_large else 350000,
        "txn_type": "RTGS" if is_large else "UPI",
        "channel": "mobile",
        "device_known": not is_fraud,
        "ip_address": "185.220.101.55" if is_fraud else "103.21.58.12",
        "geo_location": "Mumbai",
        "narrative": (
            f"Scenario derived from description: {description[:200]}. "
            f"{'High-risk signals detected — device unknown, suspicious IP, large amount.' if is_fraud else 'Low-risk transaction pattern — trusted device, normal IP, standard amount.'}"
        ),
    }
