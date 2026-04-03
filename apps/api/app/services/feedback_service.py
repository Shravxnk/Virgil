"""Feedback service: handles fraud confirmation and model feedback loop."""

import json
import os
from datetime import datetime

from app.config import get_settings
from app.schemas.feedback import FeedbackRequest, FeedbackResponse


# In-memory feedback store (persisted to file for demo)
_feedback_store: list[dict] = []


def _load_feedback():
    global _feedback_store
    settings = get_settings()
    path = os.path.join(settings.data_dir, "sample", "feedback_log.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            _feedback_store = json.load(f)


def _save_feedback():
    settings = get_settings()
    path = os.path.join(settings.data_dir, "sample", "feedback_log.json")
    with open(path, "w") as f:
        json.dump(_feedback_store, f, indent=2)


def submit_feedback(request: FeedbackRequest) -> FeedbackResponse:
    _load_feedback()

    entry = {
        "case_id": request.case_id,
        "confirmed_fraud": request.confirmed_fraud,
        "analyst_id": request.analyst_id,
        "notes": request.notes,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    _feedback_store.append(entry)
    _save_feedback()

    total_feedback = len(_feedback_store)
    confirmed_fraud_count = sum(1 for f in _feedback_store if f["confirmed_fraud"])
    false_positive_count = total_feedback - confirmed_fraud_count

    # Simulated updated model stats reflecting the feedback loop
    base_accuracy = 0.96
    improvement = min(0.03, total_feedback * 0.001)

    updated_stats = {
        "total_feedback_entries": total_feedback,
        "confirmed_fraud_count": confirmed_fraud_count,
        "false_positive_count": false_positive_count,
        "estimated_model_accuracy": round(base_accuracy + improvement, 4),
        "last_feedback": entry["timestamp"],
    }

    status = "resolved_fraud" if request.confirmed_fraud else "resolved_legitimate"

    return FeedbackResponse(
        case_id=request.case_id,
        status=status,
        message=f"Feedback recorded. Case marked as {status}. Model stats updated.",
        updated_model_stats=updated_stats,
    )
