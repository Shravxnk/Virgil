from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class CaseStatus(str, Enum):
    open = "open"
    investigating = "investigating"
    escalated = "escalated"
    resolved_fraud = "resolved_fraud"
    resolved_legitimate = "resolved_legitimate"
    closed = "closed"


class BehavioralAnalysis(BaseModel):
    baseline_avg_amount: float
    current_amount: float
    deviation: float
    usual_time_range: str
    transaction_time: str
    time_anomaly: bool
    usual_locations: list[str]
    transaction_location: Optional[str] = None


class DeviceAnalysis(BaseModel):
    known_device: bool
    device_id: str
    device_type: str
    os: str
    ip_address: str
    ip_risk: str
    geo_location: str


class NetworkAnalysis(BaseModel):
    circular_transfers: bool
    hop_count: int
    connected_suspicious_accounts: int
    layering_detected: bool


class Evidence(BaseModel):
    behavioral_analysis: BehavioralAnalysis
    device_analysis: DeviceAnalysis
    network_analysis: NetworkAnalysis


class TimelineEvent(BaseModel):
    timestamp: str
    event_type: str
    description: str
    actor: str
    metadata: dict = Field(default_factory=dict)


class SimilarCase(BaseModel):
    id: str
    title: str
    similarity: float = Field(..., ge=0, le=1)
    outcome: str
    risk_score: float


class CaseNote(BaseModel):
    id: str
    author: str
    content: str
    timestamp: str


class CaseListItem(BaseModel):
    id: str
    status: CaseStatus
    title: str
    risk_score: float
    assigned_to: str
    created_at: str
    updated_at: str
    total_exposure: float
    alert_count: int


class CaseDetailResponse(BaseModel):
    id: str
    status: CaseStatus
    created_at: str
    updated_at: str
    assigned_to: str
    title: str
    description: str
    risk_score: float
    explanation: Optional[str] = None
    recommended_action: str
    alert_ids: list[str]
    transaction_ids: list[str]
    primary_account: str
    total_exposure: float
    evidence: Evidence
    alerts: list[dict] = Field(default_factory=list)
    transactions: list[dict] = Field(default_factory=list)
    timeline: list[TimelineEvent]
    similar_cases: list[SimilarCase]
    notes: list[CaseNote]


class CaseListResponse(BaseModel):
    cases: list[CaseListItem]
    total: int
