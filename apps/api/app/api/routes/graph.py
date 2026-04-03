"""Graph routes."""

from fastapi import APIRouter, HTTPException
from app.services.case_service import get_case_detail
from app.graph.analyzer import analyze_case_graph
from app.schemas.graph import GraphDataResponse

router = APIRouter(prefix="/graph", tags=["Graph Analysis"])


@router.get("/{case_id}", response_model=GraphDataResponse)
async def get_case_graph(case_id: str):
    """Get the transaction network graph for a case with suspicious path detection."""
    case = await get_case_detail(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    graph_data = analyze_case_graph(case.transaction_ids)
    return graph_data
