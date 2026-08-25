from slowapi import Limiter
from fastapi import Request


def _client_ip(request: Request) -> str:
    """Rate-limit key based on the client IP.

    Behind Render's reverse proxy the original client IP arrives in the
    X-Forwarded-For header (first value is the client, not the proxy).
    Falls back to the direct connection address otherwise.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# Shared limiter instance; wired into app.state in app.main.
limiter = Limiter(key_func=_client_ip)
