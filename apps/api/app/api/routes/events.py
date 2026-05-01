"""Server-Sent Events (SSE) endpoint — real-time push to all connected dashboard clients.

Any route that scores/modifies data calls `broadcast()` after the DB write.
The frontend connects via:  const es = new EventSource(`${API_BASE}/api/events/stream`);
"""

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/events", tags=["Events"])

# ── In-process pub/sub ──────────────────────────────────────────────────────
# One asyncio.Queue per connected browser tab.
_clients: list[asyncio.Queue] = []
_MAX_QUEUE = 64


async def broadcast(event_type: str, payload: dict[str, Any]) -> None:
    """Push an SSE message to every connected client. Non-blocking."""
    msg = f"data: {json.dumps({'type': event_type, **payload})}\n\n"
    dead: list[asyncio.Queue] = []
    for q in list(_clients):
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        try:
            _clients.remove(q)
        except ValueError:
            pass


# ── SSE endpoint ─────────────────────────────────────────────────────────────
@router.get("/stream")
async def event_stream():
    """
    Persistent HTTP connection — browser receives JSON events in real-time.
    Each event: `data: {"type": "transaction_scored", ...}\n\n`
    """
    q: asyncio.Queue = asyncio.Queue(maxsize=_MAX_QUEUE)
    _clients.append(q)
    logger.info("[SSE] Client connected (%d total)", len(_clients))

    async def generator():
        # Send a heartbeat immediately so browser knows the connection is alive
        yield ": heartbeat\n\n"
        try:
            while True:
                # Yield control every 20 s to send a keep-alive comment
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=20)
                    yield msg
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            try:
                _clients.remove(q)
            except ValueError:
                pass
            logger.info("[SSE] Client disconnected (%d remaining)", len(_clients))

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
