from pydantic import BaseModel, Field
from typing import Optional


class Transaction(BaseModel):
    id: str
    from_account: str
    to_account: str
    amount: float
    currency: str
    timestamp: str
    type: str
    status: str
    channel: str
    location: Optional[str] = None


class UserProfile(BaseModel):
    id: str
    name: str
    type: str
    industry: Optional[str] = None
    country: str
    opened_date: str
    risk_rating: str
    avg_monthly_volume: float
    avg_transaction_amount: float
    usual_transaction_times: str
    usual_channels: list[str]
    usual_counterparties: list[str]
    usual_locations: list[str]
    kyc_last_updated: str
    flags: list[str]


class Device(BaseModel):
    id: str
    account_id: str
    device_type: str
    os: str
    browser: str
    fingerprint: str
    ip_address: str
    geo_location: str
    first_seen: str
    last_seen: str
    trust_score: float = Field(..., ge=0, le=100)
