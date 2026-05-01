"""Case service: manages case retrieval and detail assembly."""

import asyncio

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

    # Parallel fetch of alerts and transactions (fixes N+1 sequential queries)
    alert_tasks = [find_alert_by_id(aid) for aid in case.get("alert_ids", [])]
    txn_tasks = [find_transaction_by_id(tid) for tid in case.get("transaction_ids", [])]
    alert_results = await asyncio.gather(*alert_tasks) if alert_tasks else []
    txn_results = await asyncio.gather(*txn_tasks) if txn_tasks else []

    case_alerts = [a for a in alert_results if a is not None]
    case_txns = []
    for t in txn_results:
        if t is not None:
            # Normalize field names for the frontend Transaction type
            case_txns.append({
                "id": t["id"],
                "from_account": t.get("from_account", ""),
                "to_account": t.get("to_account", ""),
                "amount": t.get("amount", 0),
                "currency": t.get("currency", "INR"),
                "timestamp": t.get("timestamp") or t.get("ts", ""),
                "type": t.get("txn_type", t.get("type", "")),
                "status": t.get("status", "completed"),
                "channel": t.get("channel", ""),
                "location": t.get("geo_location", None),
                "risk_score": t.get("risk_score", 0),
                "flagged": t.get("flagged", False),
            })

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

