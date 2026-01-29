from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from collections import defaultdict
import logging
import time

from app.api.routes import moderate, analyze, search, recommend
from app.services import vector_db
from app.config import get_settings

logger = logging.getLogger(__name__)


# Simple in-memory rate limiter
class RateLimiter:
    """
    Simple in-memory rate limiter with sliding window.
    Tracks request counts per client IP per endpoint.
    """
    def __init__(self):
        # Structure: {endpoint: {client_ip: [timestamp, ...]}}
        self._requests: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
        self._cleanup_counter = 0

    def _cleanup_stale_ips(self) -> None:
        """Remove IPs with no recent requests to prevent unbounded memory growth."""
        for endpoint in list(self._requests.keys()):
            for ip in list(self._requests[endpoint].keys()):
                if not self._requests[endpoint][ip]:
                    del self._requests[endpoint][ip]
            if not self._requests[endpoint]:
                del self._requests[endpoint]

    def is_rate_limited(self, client_ip: str, endpoint: str, limit: int, window_seconds: int = 60) -> bool:
        """
        Check if a client has exceeded the rate limit for an endpoint.

        Args:
            client_ip: The client's IP address
            endpoint: The endpoint being accessed
            limit: Maximum requests allowed in the window
            window_seconds: Time window in seconds (default 60)

        Returns:
            True if rate limited, False otherwise
        """
        now = time.time()
        window_start = now - window_seconds

        # Clean old entries and count recent requests
        requests = self._requests[endpoint][client_ip]
        # Keep only requests within the window
        self._requests[endpoint][client_ip] = [ts for ts in requests if ts > window_start]

        # Periodic cleanup of stale IPs (every 100 requests)
        self._cleanup_counter += 1
        if self._cleanup_counter >= 100:
            self._cleanup_counter = 0
            self._cleanup_stale_ips()

        if len(self._requests[endpoint][client_ip]) >= limit:
            return True

        # Record this request
        self._requests[endpoint][client_ip].append(now)
        return False


# Global rate limiter instance
rate_limiter = RateLimiter()

# Rate limits per endpoint (requests per minute)
RATE_LIMITS = {
    "/api/moderate": 10,
    "/api/analyze": 5,
    "/api/search": 20,
    "/api/recommend": 20,
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware that enforces per-endpoint request limits.
    """
    async def dispatch(self, request: Request, call_next):
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Check if this endpoint has rate limiting
        path = request.url.path
        limit = next((v for k, v in RATE_LIMITS.items() if path.startswith(k)), None)

        if limit is not None:
            if rate_limiter.is_rate_limited(client_ip, path, limit):
                logger.warning(f"Rate limit exceeded for {client_ip} on {path}")
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded. Please try again later."}
                )

        return await call_next(request)


class InternalAPIKeyMiddleware(BaseHTTPMiddleware):
    """
    SECURITY: Validates internal API key for service-to-service communication.
    This prevents unauthorized access if the internal network is compromised.
    Health check is excluded to allow orchestrators to verify service status.
    """
    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        
        # Skip auth for health check endpoint (needed for orchestration)
        if request.url.path == "/health":
            return await call_next(request)
        
        # In production, require internal API key
        if settings.environment == "production" and settings.internal_api_key:
            api_key = request.headers.get("X-Internal-API-Key")
            if api_key != settings.internal_api_key:
                logger.warning(
                    f"Unauthorized API access attempt from {request.client.host if request.client else 'unknown'}"
                )
                raise HTTPException(status_code=403, detail="Invalid or missing API key")
        
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await vector_db.ensure_collection()
    yield


app = FastAPI(
    title="SolShare AI Service",
    description="AI/ML microservice for content moderation, analysis, search, and recommendations",
    version="1.0.0",
    lifespan=lifespan,
)

# SECURITY: Restrict CORS to backend service only to prevent direct access from browsers
# This ensures all requests go through the backend which applies rate limiting and authentication
settings = get_settings()
allowed_origins = [settings.backend_url]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["POST", "GET"],  # Only allow methods actually used by the service
    allow_headers=["Content-Type", "Authorization", "X-Internal-API-Key"],
)

# Add internal API key authentication middleware
app.add_middleware(InternalAPIKeyMiddleware)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

app.include_router(moderate.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(recommend.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
