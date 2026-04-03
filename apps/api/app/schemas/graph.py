
from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    risk_score: float = Field(default=0, ge=0, le=100)
    flagged: bool = False
    metadata: dict = Field(default_factory=dict)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    amount: float
    currency: str
    timestamp: str
    suspicious: bool = False


class GraphCluster(BaseModel):
    id: str
    node_ids: list[str]
    risk_score: float


class GraphDataResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    suspicious_paths: list[list[str]]
    clusters: list[GraphCluster]
