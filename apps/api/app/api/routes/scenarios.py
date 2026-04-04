"""Scenario generation route — uses OpenAI to build transaction parameters from a description."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.llm.explainer import generate_scenario_from_description

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


class ScenarioRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=1000)


@router.post("/generate")
async def generate_scenario(request: ScenarioRequest):
    """Generate realistic transaction parameters from a plain-English fraud scenario description using AI.

    Returns a JSON object with from_account, to_account, amount, txn_type, channel,
    device_known, ip_address, geo_location, and a narrative explaining the scenario.
    Falls back to rule-based generation when OpenAI is not configured.
    """
    params = generate_scenario_from_description(request.description)
    return params
