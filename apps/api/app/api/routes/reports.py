"""Report routes."""

import asyncio
import io

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.report import ReportMetadata
from app.services.case_service import get_case_detail
from app.utils.pdf_generator import generate_report_pdf

router = APIRouter(prefix="/report", tags=["Reports"])


@router.get("/{case_id}/pdf")
async def download_report_pdf(case_id: str):
    """Generate and download an FIU-style PDF report for a case."""
    case = await get_case_detail(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    pdf_bytes, metadata = await asyncio.to_thread(generate_report_pdf, case.model_dump())

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="chakravyuh-report-{case_id}.pdf"',
            "X-Report-Id": metadata["report_id"],
            "X-Custody-Hash": metadata["custody_hash"],
        },
    )


@router.get("/{case_id}/metadata", response_model=ReportMetadata)
async def get_report_metadata(case_id: str):
    """Get report metadata without generating the full PDF."""
    case = await get_case_detail(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    _, metadata = await asyncio.to_thread(generate_report_pdf, case.model_dump())
    return ReportMetadata(**metadata)
