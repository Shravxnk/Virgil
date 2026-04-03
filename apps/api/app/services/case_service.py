"""Case service: manages case retrieval and detail assembly."""

from app.core.data_loader import load_alerts, load_cases, load_transactions
from app.schemas.case import CaseDetailResponse, CaseListItem, CaseListResponse


async def get_all_cases(
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> CaseListResponse:
    from app.db import connection
    if connection.PG_AVAILABLE:
        from app.db.repositories.case_repo import count_cases, find_cases
        cases = await find_cases(status=status, limit=limit, skip=offset)
        total = await count_cases(status=status)
    else:
        cases = load_cases()
        if status:
            cases = [c for c in cases if c["status"] == status]
        total = len(cases)
        cases = cases[offset: offset + limit]

    items = [
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
        for c in cases
    ]
    return CaseListResponse(cases=items, total=total)


async def get_case_detail(case_id: str) -> CaseDetailResponse | None:
    from app.db import connection

    if connection.PG_AVAILABLE:
        from app.db.repositories.alert_repo import find_alert_by_id
        from app.db.repositories.case_repo import find_case_by_id
        from app.db.repositories.transaction_repo import find_transaction_by_id
        case = await find_case_by_id(case_id)
        if not case:
            return None
        case_alerts = [
            a for aid in case.get("alert_ids", [])
            if (a := await find_alert_by_id(aid)) is not None
        ]
        case_txns = [
            t for tid in case.get("transaction_ids", [])
            if (t := await find_transaction_by_id(tid)) is not None
        ]
    else:
        case = next((c for c in load_cases() if c["id"] == case_id), None)
        if not case:
            return None
        all_alerts = load_alerts()
        all_txns = load_transactions()
        case_alerts = [a for a in all_alerts if a["id"] in case.get("alert_ids", [])]
        case_txns = [t for t in all_txns if t["id"] in case.get("transaction_ids", [])]

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
        transactions=case_txns,
        timeline=case["timeline"],
        similar_cases=case["similar_cases"],
        notes=case["notes"],
    )

