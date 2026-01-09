from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
import logging

from app.api.routes import moderate, analyze, search, recommend
from app.services import vector_db
from app.config import get_settings

logger = logging.getLogger(__name__)


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

app.include_router(moderate.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(recommend.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
