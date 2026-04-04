"""Case service: manages case retrieval and detail assembly."""

from app.schemas.case import CaseDetailResponse, CaseListItem, CaseListResponse


async def get_all_cases(
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> CaseListResponse:
    from app.db.repositories.case_repo import count_cases, find_cases
    cases = await find_cases(status=status, limit=limit, skip=offset)
    total = await count_cases(status=status)

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

