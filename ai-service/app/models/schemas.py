from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Literal
import re


def to_camel(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ModerationScores(CamelModel):
    nsfw: float = 0.0
    violence: float = 0.0
    hate: float = 0.0
    child_safety: float = 0.0
    spam: float = 0.0
    drugs_weapons: float = 0.0


class ModerationRequest(BaseModel):
    # 50MB max image = ~67M chars in base64 encoding
    image_base64: str = Field(..., max_length=67_000_000)
    caption: str | None = Field(default=None, max_length=10_000)
    wallet: str | None = None


class ModerationResponse(CamelModel):
    verdict: Literal["allow", "warn", "block"]
    scores: ModerationScores
    max_score: float
    explanation: str
    processing_time_ms: int
    blocked_category: str | None = None
    violation_id: str | None = None


class HashCheckRequest(BaseModel):
    image_hash: str = Field(..., min_length=16, max_length=128)

    @field_validator('image_hash')
    @classmethod
    def validate_hex_format(cls, v: str) -> str:
        """Validate that image_hash contains only hexadecimal characters."""
        if not re.fullmatch(r'[a-fA-F0-9]+', v):
            raise ValueError('image_hash must contain only hexadecimal characters')
        return v.lower()


class HashCheckResponse(CamelModel):
    known_bad: bool
    reason: str | None = None
    blocked_at: str | None = None


class AnalyzeRequest(BaseModel):
    content_uri: str = Field(..., max_length=2048)
    caption: str | None = Field(default=None, max_length=10_000)
    post_id: str | None = None
    creator_wallet: str | None = None


class AnalyzeResponse(CamelModel):
    description: str
    tags: list[str]
    scene_type: str
    objects: list[str]
    mood: str
    colors: list[str]
    safety_score: float
    alt_text: str
    embedding: list[float] | None = None


class SearchRequest(BaseModel):
    query: str
    limit: int = Field(default=50, le=100)
    rerank: bool = True


class SearchResult(CamelModel):
    post_id: str
    score: float
    description: str | None = None
    creator_wallet: str | None = None


class SearchResponse(CamelModel):
    results: list[SearchResult]
    expanded_query: str


class RecommendRequest(BaseModel):
    user_wallet: str
    liked_post_ids: list[str] = []
    limit: int = Field(default=50, le=100)
    exclude_seen: list[str] = []


class RecommendResult(CamelModel):
    post_id: str
    score: float
    reason: str | None = None


class RecommendResponse(CamelModel):
    recommendations: list[RecommendResult]
    taste_profile: str | None = None
