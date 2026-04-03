"""PDF report generator for FIU-style investigation reports."""

import io
import os
import uuid
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

from app.utils import compute_custody_hash
from app.llm.explainer import generate_report_narrative


def generate_report_pdf(case_data: dict) -> tuple[bytes, dict]:
    """Generate a professional FIU-style PDF report for a case.
    
    Returns (pdf_bytes, metadata_dict).
    """
    report_id = f"RPT-{uuid.uuid4().hex[:8].upper()}"
    generated_at = datetime.utcnow().isoformat() + "Z"
    custody_hash = compute_custody_hash(case_data, report_id)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="ReportTitle",
        parent=styles["Title"],
        fontSize=18,
        textColor=colors.HexColor("#1a1a2e"),
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="SectionHead",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#16213e"),
        spaceBefore=16,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="BodyText2",
        parent=styles["BodyText"],
        fontSize=10,
        leading=14,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="SmallGray",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.gray,
    ))
    styles.add(ParagraphStyle(
        name="Confidential",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.red,
        alignment=1,
        spaceAfter=12,
    ))

    story = []

    # Header
    story.append(Paragraph("CONFIDENTIAL — FOR AUTHORIZED USE ONLY", styles["Confidential"]))
    story.append(Paragraph("CHAKRAVYUH — Financial Intelligence Unit", styles["ReportTitle"]))
    story.append(Paragraph("Investigation Report", styles["Heading3"]))
    story.append(Spacer(1, 4))

    meta_data = [
        ["Report ID:", report_id, "Case ID:", case_data.get("id", "N/A")],
        ["Generated:", generated_at[:10], "Status:", case_data.get("status", "N/A")],
        ["Analyst:", case_data.get("assigned_to", "N/A"), "Risk Score:", f"{case_data.get('risk_score', 0)}/100"],
    ]
    meta_table = Table(meta_data, colWidths=[1.2 * inch, 2.0 * inch, 1.2 * inch, 2.0 * inch])
    meta_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#333333")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#333333")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc")))

    # 1. Executive Summary
    story.append(Paragraph("1. Executive Summary", styles["SectionHead"]))
    story.append(Paragraph(case_data.get("description", "No description available."), styles["BodyText2"]))

    # 2. Subject Information
    story.append(Paragraph("2. Subject Information", styles["SectionHead"]))
    story.append(Paragraph(
        f"<b>Primary Account:</b> {case_data.get('primary_account', 'N/A')}<br/>"
        f"<b>Title:</b> {case_data.get('title', 'N/A')}<br/>"
        f"<b>Total Exposure:</b> ${case_data.get('total_exposure', 0):,.2f}<br/>"
        f"<b>Recommended Action:</b> {case_data.get('recommended_action', 'N/A')}",
        styles["BodyText2"],
    ))

    # 3. Suspicious Activity Narrative
    story.append(Paragraph("3. Suspicious Activity Description", styles["SectionHead"]))
    evidence_summary = _format_evidence_text(case_data.get("evidence", {}))
    narrative = generate_report_narrative(case_data, evidence_summary)
    story.append(Paragraph(narrative, styles["BodyText2"]))

    # 4. Transaction Details
    story.append(Paragraph("4. Transaction Details", styles["SectionHead"]))
    txn_ids = case_data.get("transaction_ids", [])
    if txn_ids:
        from app.core.data_loader import load_transactions
        all_txns = load_transactions()
        case_txns = [t for t in all_txns if t["id"] in txn_ids]

        txn_table_data = [["ID", "From", "To", "Amount", "Date", "Type"]]
        for t in case_txns:
            txn_table_data.append([
                t["id"],
                t["from_account"],
                t["to_account"],
                f"${t['amount']:,.2f}",
                t["timestamp"][:10],
                t["type"],
            ])

        txn_table = Table(txn_table_data, colWidths=[0.8 * inch, 0.9 * inch, 0.9 * inch, 1.0 * inch, 0.9 * inch, 0.7 * inch])
        txn_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")]),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(txn_table)
    else:
        story.append(Paragraph("No transactions associated with this case.", styles["BodyText2"]))

    # 5. Evidence and Indicators
    story.append(Paragraph("5. Evidence and Risk Indicators", styles["SectionHead"]))
    story.append(Paragraph(evidence_summary, styles["BodyText2"]))

    # 6. Timeline
    story.append(Paragraph("6. Timeline of Events", styles["SectionHead"]))
    timeline = case_data.get("timeline", [])
    for event in timeline[:10]:
        story.append(Paragraph(
            f"<b>{event['timestamp'][:16]}</b> — [{event['event_type']}] {event['description']}",
            styles["BodyText2"],
        ))

    # 7. Similar Cases
    story.append(Paragraph("7. Similar Historical Cases", styles["SectionHead"]))
    similar = case_data.get("similar_cases", [])
    if similar:
        for sc in similar:
            story.append(Paragraph(
                f"• <b>{sc['id']}</b>: {sc['title']} — Similarity: {sc['similarity']:.0%}, "
                f"Outcome: {sc['outcome']}, Risk: {sc['risk_score']}/100",
                styles["BodyText2"],
            ))
    else:
        story.append(Paragraph("No similar historical cases identified.", styles["BodyText2"]))

    # Footer
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc")))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"Chain-of-Custody Hash: {custody_hash}", styles["SmallGray"]))
    story.append(Paragraph(f"Generated by Chakravyuh Fraud Intelligence System — {generated_at}", styles["SmallGray"]))
    story.append(Paragraph("CLASSIFICATION: CONFIDENTIAL", styles["Confidential"]))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    metadata = {
        "report_id": report_id,
        "case_id": case_data.get("id", "N/A"),
        "generated_at": generated_at,
        "custody_hash": custody_hash,
        "page_count": len(story) // 8 + 1,
    }

    return pdf_bytes, metadata


def _format_evidence_text(evidence: dict) -> str:
    """Format evidence dict into readable text."""
    lines = []
    ba = evidence.get("behavioral_analysis", {})
    if ba:
        lines.append(f"Behavioral Analysis: Amount deviation {ba.get('deviation', 'N/A')}x from baseline. "
                      f"Baseline avg: ${ba.get('baseline_avg_amount', 0):,.2f}, "
                      f"Transaction: ${ba.get('current_amount', 0):,.2f}. "
                      f"Time anomaly: {'Yes' if ba.get('time_anomaly') else 'No'}.")

    da = evidence.get("device_analysis", {})
    if da:
        lines.append(f"Device Analysis: {'Known' if da.get('known_device') else 'Unknown'} device "
                      f"({da.get('device_type', 'N/A')}, {da.get('os', 'N/A')}). "
                      f"IP: {da.get('ip_address', 'N/A')} ({da.get('ip_risk', 'N/A')} risk). "
                      f"Location: {da.get('geo_location', 'N/A')}.")

    na = evidence.get("network_analysis", {})
    if na:
        lines.append(f"Network Analysis: Circular transfers: {'Detected' if na.get('circular_transfers') else 'None'}. "
                      f"Hop count: {na.get('hop_count', 0)}. "
                      f"Connected suspicious accounts: {na.get('connected_suspicious_accounts', 0)}. "
                      f"Layering: {'Detected' if na.get('layering_detected') else 'None'}.")

    return "\n".join(lines) if lines else "No evidence data available."
