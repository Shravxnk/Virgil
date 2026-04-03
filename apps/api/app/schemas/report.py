from pydantic import BaseModel


class ReportRequest(BaseModel):
    case_id: str
    include_graph: bool = True
    include_timeline: bool = True
    include_evidence: bool = True


class ReportMetadata(BaseModel):
    report_id: str
    case_id: str
    generated_at: str
    custody_hash: str
    page_count: int
