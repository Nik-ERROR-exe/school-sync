"""Public keep-alive endpoint (no authentication required).

Used by the frontend keep-alive hook to prevent the Render free-tier
server from sleeping during active sessions.
"""

from fastapi import APIRouter

router = APIRouter(tags=["Ping"])


@router.get("/ping")
def ping():
    return {"status": "ok"}