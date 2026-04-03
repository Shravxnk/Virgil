"""Case service: manages case retrieval and detail assembly."""

from app.core.data_loader import load_cases, load_alerts, load_transactions
from app.schemas.case import CaseDetailResponse, CaseListItem, CaseListResponse


def get_all_cases(
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> CaseListResponse:
    cases = load_cases()

    if status:
        cases = [c for c in cases if c["status"] == status]

    total = len(cases)
    paginated = cases[offset : offset + limit]

    items = []
    for c in paginated:
        items.append(
            CaseListItem(
                id=c["id"],
                status=c["status"],
                title=c["title"],
                risk_score=c["risk_score"],
                assigned_to=c["assigned_to"],
                created_at=c["created_at"],
                updated_at=c["updated_at"],
                total_exposure=c["total_exposure"],
                alert_count=len(c.get("alert_ids", [])),
            )
        )

    return CaseListResponse(cases=items, total=total)


def get_case_detail(case_id: str) -> CaseDetailResponse | None:
    cases = load_cases()
    alerts = load_alerts()

    case = None
    for c in cases:
        if c["id"] == case_id:
            case = c
            break

    if not case:
        return None

    case_alerts = [a for a in alerts if a["id"] in case.get("alert_ids", [])]

    all_transactions = load_transactions()
    case_transactions = [t for t in all_transactions if t["id"] in case.get("transaction_ids", [])]

    return CaseDetailResponse(
        id=case["id"],
        status=case["status"],
        created_at=case["created_at"],
        updated_at=case["updated_at"],
        assigned_to=case["assigned_to"],
        title=case["title"],
        description=case["description"],
        risk_score=case["risk_score"],
        explanation=case.get("explanation"),
        recommended_action=case["recommended_action"],
        alert_ids=case.get("alert_ids", []),
        transaction_ids=case.get("transaction_ids", []),
        primary_account=case["primary_account"],
        total_exposure=case["total_exposure"],
        evidence=case["evidence"],
        alerts=case_alerts,
        transactions=case_transactions,
        timeline=case["timeline"],
        similar_cases=case["similar_cases"],
        notes=case["notes"],
    )
