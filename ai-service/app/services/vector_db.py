from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    VectorParams,
    Distance,
    PayloadSchemaType,
)
from app.config import get_settings

_client: AsyncQdrantClient | None = None


async def get_client() -> AsyncQdrantClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncQdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
    return _client


async def ensure_collection():
    """Create collection if it doesn't exist."""
    client = await get_client()
    settings = get_settings()

    collections = await client.get_collections()
    exists = any(c.name == settings.qdrant_collection for c in collections.collections)

    if not exists:
        await client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=VectorParams(size=settings.voyage_dimensions, distance=Distance.COSINE),
        )
        await client.create_payload_index(
            settings.qdrant_collection, "creator_wallet", PayloadSchemaType.KEYWORD
        )
        await client.create_payload_index(
            settings.qdrant_collection, "scene_type", PayloadSchemaType.KEYWORD
        )
        await client.create_payload_index(
            settings.qdrant_collection, "timestamp", PayloadSchemaType.INTEGER
        )


async def upsert_post(
    post_id: str,
    embedding: list[float],
    payload: dict,
):
    """Index or update a post embedding."""
    client = await get_client()
    settings = get_settings()

    await client.upsert(
        collection_name=settings.qdrant_collection,
        points=[PointStruct(id=post_id, vector=embedding, payload=payload)],
    )


async def search_similar(
    embedding: list[float],
    limit: int = 50,
    exclude_ids: list[str] | None = None,
    creator_filter: str | None = None,
) -> list[dict]:
    """Search for similar posts by embedding."""
    client = await get_client()
    settings = get_settings()

    filter_conditions = []
    if creator_filter:
        filter_conditions.append(
            FieldCondition(field="creator_wallet", match=MatchValue(value=creator_filter))
        )

    query_filter = Filter(must=filter_conditions) if filter_conditions else None

    results = await client.search(
        collection_name=settings.qdrant_collection,
        query_vector=embedding,
        limit=limit + len(exclude_ids or []),
        query_filter=query_filter,
        with_payload=True,
    )

    exclude_set = set(exclude_ids or [])
    return [
        {"post_id": str(r.id), "score": r.score, **(r.payload or {})}
        for r in results
        if str(r.id) not in exclude_set
    ][:limit]


async def get_posts_by_ids(post_ids: list[str]) -> list[dict]:
    """Retrieve posts by their IDs."""
    if not post_ids:
        return []

    client = await get_client()
    settings = get_settings()

    results = await client.retrieve(
        collection_name=settings.qdrant_collection,
        ids=post_ids,
        with_payload=True,
        with_vectors=True,
    )

    return [
        {"post_id": str(r.id), "embedding": r.vector, **(r.payload or {})}
        for r in results
    ]
