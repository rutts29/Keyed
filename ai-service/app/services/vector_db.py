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


async def reset_collection():
    """Delete and recreate the collection (for model migration)."""
    client = await get_client()
    settings = get_settings()

    # Delete if exists
    collections = await client.get_collections()
    exists = any(c.name == settings.qdrant_collection for c in collections.collections)
    if exists:
        await client.delete_collection(settings.qdrant_collection)

    # Recreate with fresh config
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


def _to_uuid(hex_id: str) -> str:
    """Convert 32-char hex ID to UUID format for Qdrant."""
    # If already has dashes, return as-is
    if '-' in hex_id:
        return hex_id
    # Insert dashes: 8-4-4-4-12
    if len(hex_id) == 32:
        return f"{hex_id[:8]}-{hex_id[8:12]}-{hex_id[12:16]}-{hex_id[16:20]}-{hex_id[20:]}"
    return hex_id


async def upsert_post(
    post_id: str,
    embedding: list[float],
    payload: dict,
):
    """Index or update a post embedding."""
    client = await get_client()
    settings = get_settings()

    # Convert hex ID to UUID format for Qdrant
    uuid_id = _to_uuid(post_id)

    await client.upsert(
        collection_name=settings.qdrant_collection,
        points=[PointStruct(id=uuid_id, vector=embedding, payload=payload)],
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

    response = await client.query_points(
        collection_name=settings.qdrant_collection,
        query=embedding,
        limit=limit + len(exclude_ids or []),
        query_filter=query_filter,
        with_payload=True,
    )

    # Convert exclude_ids to UUID format for comparison
    exclude_set = set(_to_uuid(eid) for eid in (exclude_ids or []))
    return [
        {"post_id": str(r.id).replace("-", ""), "score": r.score, **(r.payload or {})}
        for r in response.points
        if str(r.id) not in exclude_set
    ][:limit]


async def get_posts_by_ids(post_ids: list[str]) -> list[dict]:
    """Retrieve posts by their IDs."""
    if not post_ids:
        return []

    client = await get_client()
    settings = get_settings()

    # Convert hex IDs to UUID format for Qdrant
    uuid_ids = [_to_uuid(pid) for pid in post_ids]

    results = await client.retrieve(
        collection_name=settings.qdrant_collection,
        ids=uuid_ids,
        with_payload=True,
        with_vectors=True,
    )

    return [
        {"post_id": str(r.id).replace("-", ""), "embedding": r.vector, **(r.payload or {})}
        for r in results
    ]
