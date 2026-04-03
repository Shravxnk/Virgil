from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class AlertStatus(str, Enum):
    new = "new"
    open = "open"
    investigating = "investigating"
    resolved = "resolved"
    escalated = "escalated"


class AlertResponse(BaseModel):
    id: str
    case_id: Optional[str] = None
    transaction_id: Optional[str] = None
    alert_type: str
    severity: Severity
    status: AlertStatus
    title: str
    description: str
    risk_score: float = Field(..., ge=0, le=100)
    timestamp: str
    account_id: str
    account_name: str
    amount: float
    currency: str


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int
