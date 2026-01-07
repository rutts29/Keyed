import voyageai
from app.config import get_settings

_client: voyageai.AsyncClient | None = None


def get_client() -> voyageai.AsyncClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = voyageai.AsyncClient(api_key=settings.voyage_api_key)
    return _client


async def generate_embedding(text: str) -> list[float]:
    """Generate embedding using Voyage 3.5."""
    settings = get_settings()
    result = await get_client().embed(
        texts=[text],
        model=settings.voyage_model,
        input_type="document",
    )
    return result.embeddings[0]


async def generate_query_embedding(query: str) -> list[float]:
    """Generate embedding for search query."""
    settings = get_settings()
    result = await get_client().embed(
        texts=[query],
        model=settings.voyage_model,
        input_type="query",
    )
    return result.embeddings[0]


async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts."""
    if not texts:
        return []

    settings = get_settings()
    result = await get_client().embed(
        texts=texts,
        model=settings.voyage_model,
        input_type="document",
    )
    return result.embeddings
