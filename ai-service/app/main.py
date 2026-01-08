from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routes import moderate, analyze, search, recommend
from app.services import vector_db
from app.config import get_settings


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
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(moderate.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(recommend.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
