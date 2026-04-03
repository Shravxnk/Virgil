"""Feedback and knowledge search routes."""

from fastapi import APIRouter

from app.llm.explainer import answer_knowledge_query
from app.retrieval.vector_store import route_query, search_collection
from app.schemas.feedback import (
    FeedbackRequest,
    FeedbackResponse,
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    KnowledgeSearchResult,
)
from app.services.feedback_service import submit_feedback

router = APIRouter(tags=["Feedback & Knowledge"])


@router.post("/feedback/confirm", response_model=FeedbackResponse)
async def confirm_feedback(request: FeedbackRequest):
    """Submit fraud confirmation feedback for a case. Updates case status and model learning stats."""
    return submit_feedback(request)


@router.post("/knowledge/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(request: KnowledgeSearchRequest):
    """Search the fraud intelligence knowledge base using vector retrieval."""
    collection = request.collection or route_query(request.query)
    results = search_collection(collection, request.query, top_k=request.top_k)

    # If we have results and a configured LLM, enhance with AI-generated answer
    if results:
        context = "\n\n".join(r["content"] for r in results[:3])
        enhanced_answer = answer_knowledge_query(request.query, context, collection)
        results.insert(0, {
            "content": enhanced_answer,
            "source": "ai_generated",
            "relevance_score": 1.0,
        })

    return KnowledgeSearchResponse(
        results=[KnowledgeSearchResult(**r) for r in results],
        query=request.query,
        collection_used=collection,
    )
