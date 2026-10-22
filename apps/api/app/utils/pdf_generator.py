"""PDF report generator for FIU-style investigation reports."""

import io
import os
import re
import uuid
from datetime import datetime
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.llm.explainer import generate_report_narrative
from app.utils import compute_custody_hash

# ReportLab's built-in Helvetica has no ₹ glyph (it renders as a black box), so
# use a system TTF that has one. Fonts can't be bundled (licensing), hence the
# search; if none is found, ₹ is written as "Rs." instead.
_FONT_CANDIDATES = [
    (r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\arialbd.ttf"),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"),
    ("/Library/Fonts/Arial Unicode.ttf", "/Library/Fonts/Arial Unicode.ttf"),
]


def _register_fonts() -> tuple[str, str, str]:
    """Return (regular font, bold font, rupee text) for the report."""
    for regular, bold in _FONT_CANDIDATES:
        if not (os.path.exists(regular) and os.path.exists(bold)):
            continue
        try:
            reg_font = TTFont("ReportSans", regular)
            if 0x20B9 not in reg_font.face.charToGlyph:
                continue
            pdfmetrics.registerFont(reg_font)
            pdfmetrics.registerFont(TTFont("ReportSans-Bold", bold))
            pdfmetrics.registerFontFamily("ReportSans", normal="ReportSans", bold="ReportSans-Bold",
                               italic="ReportSans", boldItalic="ReportSans-Bold")
            return "ReportSans", "ReportSans-Bold", "₹"
        except Exception:
            continue
    return "Helvetica", "Helvetica-Bold", "Rs."


_FONT, _FONT_BOLD, _RUPEE = _register_fonts()


def _rupee(text: str) -> str:
    return text if _RUPEE == "₹" else text.replace("₹", "Rs.")


def _para(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(_rupee(text), style)


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
    styles.add(ParagraphStyle(
        name="NarrativeLine",
        parent=styles["BodyText2"],
        spaceAfter=1,
    ))
    styles.add(ParagraphStyle(
        name="NarrativeHead",
        parent=styles["BodyText2"],
        fontName="Helvetica-Bold",
        spaceBefore=8,
        spaceAfter=3,
    ))

    for style in styles.byName.values():
        if not isinstance(style, ParagraphStyle):
            continue
        style.fontName = _FONT_BOLD if "Bold" in style.fontName else _FONT

    story = []

    # Header
    story.append(_para("CONFIDENTIAL — FOR AUTHORIZED USE ONLY", styles["Confidential"]))
    story.append(_para("VIRGIL — Financial Intelligence Unit", styles["ReportTitle"]))
    story.append(_para("Investigation Report", styles["Heading3"]))
    story.append(Spacer(1, 4))

    meta_data = [
        ["Report ID:", report_id, "Case ID:", case_data.get("id", "N/A")],
        ["Generated:", generated_at[:10], "Status:", case_data.get("status", "N/A")],
        ["Analyst:", case_data.get("assigned_to", "N/A"), "Risk Score:", f"{case_data.get('risk_score', 0)}/100"],
    ]
    meta_table = Table(meta_data, colWidths=[1.2 * inch, 2.0 * inch, 1.2 * inch, 2.0 * inch])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), _FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), _FONT_BOLD),
        ("FONTNAME", (2, 0), (2, -1), _FONT_BOLD),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#333333")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#333333")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc")))

    # 1. Executive Summary
    story.append(_para("1. Executive Summary", styles["SectionHead"]))
    story.append(_para(case_data.get("description", "No description available."), styles["BodyText2"]))

    # 2. Subject Information
    story.append(_para("2. Subject Information", styles["SectionHead"]))
    story.append(_para(
        f"<b>Primary Account:</b> {case_data.get('primary_account', 'N/A')}<br/>"
        f"<b>Title:</b> {case_data.get('title', 'N/A')}<br/>"
        f"<b>Total Exposure:</b> \u20b9{case_data.get('total_exposure', 0):,.0f}<br/>"
        f"<b>Recommended Action:</b> {case_data.get('recommended_action', 'N/A')}",
        styles["BodyText2"],
    ))

    # 3. Suspicious Activity Narrative (AI-generated)
    story.append(_para("3. Suspicious Activity Description", styles["SectionHead"]))
    evidence_summary = _format_evidence_text(case_data.get("evidence", {}))
    # Build enriched context for AI: include all transaction details
    txn_ids = case_data.get("transaction_ids", [])
    txn_context = evidence_summary
    if txn_ids:
        from app.db.repositories.runtime_store import list_transactions
        all_txns = list_transactions()
        case_txns = [t for t in all_txns if t["id"] in txn_ids]
        txn_lines = []
        for t in case_txns:
            txn_lines.append(
                f"  [{t['id']}] {t['timestamp'][:10]} | ₹{t['amount']:,.0f} | "
                f"From: {t['from_account']} → To: {t['to_account']} | "
                f"Type: {t.get('type', t.get('txn_type','N/A'))} | Channel: {t.get('channel','N/A')} | "
                f"Status: {t.get('status','N/A')}"
            )
        if txn_lines:
            txn_context += "\n\nLinked Transactions:\n" + "\n".join(txn_lines)
    narrative = generate_report_narrative(case_data, txn_context)
    # One paragraph per line so the narrative can break cleanly across pages
    for markup, is_heading in _narrative_to_lines(narrative):
        story.append(_para(markup, styles["NarrativeHead" if is_heading else "NarrativeLine"]))

    # 4. Transaction Details
    story.append(_para("4. Transaction Details", styles["SectionHead"]))
    txn_ids = case_data.get("transaction_ids", [])
    if txn_ids:
        from app.db.repositories.runtime_store import list_transactions
        all_txns = list_transactions()
        case_txns = [t for t in all_txns if t["id"] in txn_ids]

        txn_table_data = [["ID", "From Account", "To Account", _rupee("Amount (₹)"), "Date", "Type", "Channel"]]
        for t in case_txns:
            txn_table_data.append([
                t["id"],
                t["from_account"],
                t["to_account"],
                _rupee(f"₹{t['amount']:,.0f}"),
                t["timestamp"][:10],
                t.get("type", t.get("txn_type", "N/A")),
                t.get("channel", "N/A"),
            ])

        col_widths = [0.8*inch, 1.0*inch, 1.0*inch, 0.9*inch, 0.8*inch, 0.8*inch, 0.7*inch]
        txn_table = Table(txn_table_data, colWidths=col_widths)
        txn_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, -1), _FONT),
            ("FONTNAME", (0, 0), (-1, 0), _FONT_BOLD),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")]),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(txn_table)
    else:
        story.append(_para("No transactions associated with this case.", styles["BodyText2"]))

    # 5. Evidence and Indicators
    story.append(_para("5. Evidence and Risk Indicators", styles["SectionHead"]))
    story.append(_para(evidence_summary, styles["BodyText2"]))

    # 6. Timeline
    story.append(_para("6. Timeline of Events", styles["SectionHead"]))
    timeline = case_data.get("timeline", [])
    for event in timeline[:10]:
        story.append(_para(
            f"<b>{event['timestamp'][:16]}</b> — [{event['event_type']}] {event['description']}",
            styles["BodyText2"],
        ))

    # 7. Similar Cases
    story.append(_para("7. Similar Historical Cases", styles["SectionHead"]))
    similar = case_data.get("similar_cases", [])
    if similar:
        for sc in similar:
            story.append(_para(
                f"• <b>{sc['id']}</b>: {sc['title']} — Similarity: {sc['similarity']:.0%}, "
                f"Outcome: {sc['outcome']}, Risk: {sc['risk_score']}/100",
                styles["BodyText2"],
            ))
    else:
        story.append(_para("No similar historical cases identified.", styles["BodyText2"]))

    # Footer
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc")))
    story.append(Spacer(1, 8))
    story.append(_para(f"Chain-of-Custody Hash: {custody_hash}", styles["SmallGray"]))
    story.append(_para(f"Generated by Virgil Fraud Intelligence System — {generated_at}", styles["SmallGray"]))
    story.append(_para("CLASSIFICATION: CONFIDENTIAL", styles["Confidential"]))

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


def _narrative_to_lines(text: str) -> list[tuple[str, bool]]:
    """Turn LLM narrative text into safe ReportLab markup, one entry per line.

    Returns (markup, is_heading) pairs; blank lines are dropped (styles add the
    spacing). LLMs sometimes reply in Markdown/HTML despite instructions; raw
    `<br>` or stray `<`/`&` makes ReportLab's parser throw, so escape
    everything first and only re-introduce the tags we generate ourselves.
    """
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or re.fullmatch(r"[-|:\s]{3,}", stripped):  # blanks, Markdown rules / table separators
            continue
        md_heading = re.match(r"#{1,6}\s*(.*)", stripped)
        content = md_heading.group(1) if md_heading else stripped
        is_heading = bool(md_heading) or bool(re.match(r"\**SECTION [A-Z]\b", content))
        markup = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escape(content))
        indent = len(line) - len(line.lstrip())  # keep nested list items visibly indented
        lines.append(("&nbsp;" * indent + markup, is_heading))
    return lines


def _format_evidence_text(evidence: dict) -> str:
    """Format evidence dict into readable text."""
    lines = []
    ba = evidence.get("behavioral_analysis", {})
    if ba:
        lines.append(f"Behavioral Analysis: Amount deviation {ba.get('deviation', 'N/A')}x from baseline. "
                      f"Baseline avg: \u20b9{ba.get('baseline_avg_amount', 0):,.0f}, "
                      f"Transaction: \u20b9{ba.get('current_amount', 0):,.0f}. "
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
