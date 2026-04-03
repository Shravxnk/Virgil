from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class Decision(str, Enum):
    approve = "approve"
    mfa = "mfa"
    block = "block"
    manual_review = "manual_review"


class RiskScoreRequest(BaseModel):
    transaction_id: str = Field(..., description="Transaction ID to score")


class RiskScoreResponse(BaseModel):
    transaction_id: str
    score: float = Field(..., ge=0, le=100)
    decision: Decision
    reason_codes: list[str]
    behavioral_mismatch: float = Field(..., ge=0, le=1)
    device_mismatch: bool
    amount_anomaly: float = Field(..., ge=0)
    time_anomaly: float = Field(..., ge=0, le=1)
    beneficiary_risk: float = Field(..., ge=0, le=1)
    graph_risk: float = Field(..., ge=0, le=1)
    explanation: Optional[str] = None
