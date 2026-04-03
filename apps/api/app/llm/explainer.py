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


ALERT_EXPLANATION_SYSTEM = """You are a senior fraud analyst AI assistant at a bank's Financial Intelligence Unit.
Given a fraud alert with its risk signals, generate a clear, professional explanation
for the investigating analyst. Be specific about what triggered the alert, why it's suspicious,
and what the analyst should investigate. Use a formal but accessible tone.
Keep the explanation to 3-5 sentences."""

CASE_SUMMARY_SYSTEM = """You are a senior fraud analyst AI assistant.
Given case details including alerts, transactions, evidence, and timeline,
generate a comprehensive investigation summary. Highlight key risk indicators,
the suspected fraud pattern, and recommended next steps. Be specific and professional.
Keep the summary to 5-8 sentences."""

EXECUTIVE_SUMMARY_SYSTEM = """You are an executive risk intelligence assistant at a major bank.
Given fraud detection metrics and trends, generate a clear executive briefing paragraph.
Focus on business impact, trends, model performance, and recommended actions.
Use an executive-appropriate tone. Keep it to 4-6 sentences."""

REPORT_NARRATIVE_SYSTEM = """You are a Financial Intelligence Unit report writer.
Given case evidence and investigation details, generate a professional narrative
suitable for a Suspicious Activity Report (SAR) or internal FIU report.
Be precise, factual, and use standard financial crime reporting language.
Structure the narrative with clear paragraphs covering: activity description,
suspicious indicators, and risk assessment."""

QA_SYSTEM = """You are a fraud intelligence knowledge assistant.
Answer questions using the provided context from the bank's fraud knowledge base,
policy playbook, and historical case data. Be precise, cite specific policies
or patterns when relevant, and indicate when information is uncertain.
Keep responses concise and actionable."""


def generate_alert_explanation(alert_data: dict) -> str:
    """Generate an LLM-backed explanation for a fraud alert."""
    prompt = f"""Alert Details:
- Type: {alert_data.get('alert_type', 'unknown')}
- Title: {alert_data.get('title', '')}
- Account: {alert_data.get('account_name', '')} ({alert_data.get('account_id', '')})
- Amount: ${alert_data.get('amount', 0):,.2f} {alert_data.get('currency', 'USD')}
- Risk Score: {alert_data.get('risk_score', 0)}/100
- Severity: {alert_data.get('severity', 'unknown')}
- Description: {alert_data.get('description', '')}
- Timestamp: {alert_data.get('timestamp', '')}

Generate a professional analyst-facing explanation of this alert."""

    result = chat_completion(ALERT_EXPLANATION_SYSTEM, prompt)
    if result:
        return result

    return (
        f"Alert {alert_data.get('id', 'N/A')}: {alert_data.get('title', 'Fraud alert')}. "
        f"Risk score of {alert_data.get('risk_score', 0)} triggered by "
        f"{alert_data.get('alert_type', 'suspicious activity')} on account "
        f"{alert_data.get('account_name', 'unknown')}. "
        f"Transaction of ${alert_data.get('amount', 0):,.2f} flagged for review."
    )


def generate_case_summary(case_data: dict) -> str:
    """Generate an LLM-backed investigation summary for a case."""
    prompt = f"""Case: {case_data.get('title', '')}
Status: {case_data.get('status', '')}
Risk Score: {case_data.get('risk_score', 0)}/100
Total Exposure: ${case_data.get('total_exposure', 0):,.2f}
Description: {case_data.get('description', '')}

Evidence:
- Behavioral: amount deviation {case_data.get('evidence', {}).get('behavioral_analysis', {}).get('deviation', 'N/A')}x
- Device: {'Known' if case_data.get('evidence', {}).get('device_analysis', {}).get('known_device', True) else 'Unknown device'}
- Network: {'Circular transfers detected' if case_data.get('evidence', {}).get('network_analysis', {}).get('circular_transfers', False) else 'No circular patterns'}

Alerts: {len(case_data.get('alert_ids', []))}
Notes: {'; '.join(n.get('content', '') for n in case_data.get('notes', [])[:2])}

Generate a professional case investigation summary."""

    result = chat_completion(CASE_SUMMARY_SYSTEM, prompt)
    if result:
        return result

    return (
        f"Investigation of {case_data.get('title', 'case')} reveals a risk score of "
        f"{case_data.get('risk_score', 0)}/100 with total exposure of "
        f"${case_data.get('total_exposure', 0):,.2f}. "
        f"{case_data.get('description', 'Further investigation required.')}"
    )


def generate_executive_summary(metrics: dict) -> str:
    """Generate an executive-level summary of fraud detection metrics."""
    prompt = f"""Current Fraud Detection Metrics:
- Total Fraud Detected: ${metrics.get('total_fraud_detected', 0):,.0f}
- Active Cases: {metrics.get('active_cases', 0)}
- Detection Rate: {metrics.get('detection_rate', 0):.1%}
- False Positive Rate: {metrics.get('false_positive_rate', 0):.1%}
- Model Accuracy: {metrics.get('model_accuracy', 0):.1%}
- Regulatory Exposure: ${metrics.get('regulatory_exposure', 0):,.0f}
- Avg Resolution Time: {metrics.get('avg_resolution_time', 0):.1f} hours

Generate an executive risk briefing paragraph."""

    result = chat_completion(EXECUTIVE_SUMMARY_SYSTEM, prompt)
    if result:
        return result

    return (
        f"The fraud detection system identified ${metrics.get('total_fraud_detected', 0):,.0f} "
        f"in suspicious activity with a {metrics.get('detection_rate', 0):.1%} detection rate. "
        f"{metrics.get('active_cases', 0)} cases remain under active investigation. "
        f"Current regulatory exposure stands at ${metrics.get('regulatory_exposure', 0):,.0f}."
    )


def generate_report_narrative(case_data: dict, context: str = "") -> str:
    """Generate a professional FIU report narrative."""
    prompt = f"""Case for FIU Report:
{case_data.get('description', '')}

Evidence Summary:
{context}

Risk Score: {case_data.get('risk_score', 0)}/100
Recommended Action: {case_data.get('recommended_action', '')}
Total Exposure: ${case_data.get('total_exposure', 0):,.2f}

Generate a professional FIU report narrative covering activity description, suspicious indicators, and risk assessment."""

    result = chat_completion(REPORT_NARRATIVE_SYSTEM, prompt, max_tokens=2048)
    if result:
        return result

    return (
        f"This report documents suspicious activity involving {case_data.get('title', 'subject')}. "
        f"The investigation identified a risk score of {case_data.get('risk_score', 0)}/100 "
        f"with total exposure of ${case_data.get('total_exposure', 0):,.2f}. "
        f"{case_data.get('description', '')} "
        f"Recommended action: {case_data.get('recommended_action', 'further review')}."
    )


def answer_knowledge_query(query: str, context: str, collection: str) -> str:
    """Answer a question using retrieved context from the knowledge base."""
    prompt = f"""Context from {collection}:
{context}

Question: {query}

Answer the question using the provided context. Be specific and actionable."""

    result = chat_completion(QA_SYSTEM, prompt)
    if result:
        return result

    return f"Based on the {collection} knowledge base: please review the relevant documentation for guidance on '{query}'."
