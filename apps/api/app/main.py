"""Chakravyuh API — AI-Powered Fraud Intelligence System."""

import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is in path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.api.routes import alerts, cases, dashboard, feedback, graph, reports, risk, transactions
from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialise MongoDB connection and seed vector collections."""
    settings = get_settings()
    # PostgreSQL
    try:
        from app.db.connection import init_db
        await init_db(settings.db_host, settings.db_port, settings.db_name, settings.db_user, settings.db_password)
    except Exception as e:
        print(f"[Chakravyuh] PostgreSQL init skipped: {e}")
    # Clear JSON cache so data files are always read fresh after startup
    try:
        from app.core.data_loader import clear_all_caches
        clear_all_caches()
    except Exception:
        pass
    # Vector store (ChromaDB — optional, seeded in a daemon thread so it never blocks startup)
    import threading
    def _seed_bg():
        try:
            from app.retrieval.vector_store import seed_all_collections
            seed_all_collections()
            print("[Chakravyuh] Vector store seeding complete.")
        except Exception as e:
            print(f"[Chakravyuh] Vector store seeding skipped: {e}")
    t = threading.Thread(target=_seed_bg, daemon=True)
    t.start()
    yield


settings = get_settings()

app = FastAPI(
    title="Chakravyuh API",
    description="AI-Powered Fraud Intelligence System for Banking",
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(risk.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(cases.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "chakravyuh-api",
        "version": settings.app_version,
    }


@app.get("/api")
async def api_root():
    return {
        "service": "Chakravyuh Fraud Intelligence API",
        "version": settings.app_version,
        "endpoints": {
            "risk_scoring": "/api/risk/score?transaction_id={id}",
            "alerts": "/api/alerts",
            "cases": "/api/cases",
            "graph": "/api/graph/{case_id}",
            "report": "/api/report/{case_id}/pdf",
            "analyst_dashboard": "/api/dashboard/analyst",
            "executive_dashboard": "/api/dashboard/executive",
            "feedback": "/api/feedback/confirm",
            "knowledge": "/api/knowledge/search",
        },
    }
