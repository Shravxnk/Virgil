from typing import Optional

from pydantic import BaseModel


class FeedbackRequest(BaseModel):
    case_id: str
    confirmed_fraud: bool
    analyst_id: str
    notes: Optional[str] = None


class FeedbackResponse(BaseModel):
    case_id: str
    status: str
    message: str
    updated_model_stats: dict


class KnowledgeSearchRequest(BaseModel):
    query: str
    collection: Optional[str] = None
    top_k: int = 5


class KnowledgeSearchResult(BaseModel):
    content: str
    source: str
    relevance_score: float


class KnowledgeSearchResponse(BaseModel):
    results: list[KnowledgeSearchResult]
    query: str
    collection_used: str
