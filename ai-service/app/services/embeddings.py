import logging
import voyageai
from PIL import Image
from io import BytesIO
from app.config import get_settings

logger = logging.getLogger(__name__)

_client: voyageai.AsyncClient | None = None


def get_client() -> voyageai.AsyncClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = voyageai.AsyncClient(api_key=settings.voyage_api_key)
    return _client


async def generate_embedding(text: str) -> list[float]:
    """Generate text embedding using Voyage Multimodal.

    Uses multimodal model for compatibility with image embeddings in search.
    """
    settings = get_settings()
    client = get_client()

    # Use multimodal model for text-only documents for search compatibility
    result = await client.multimodal_embed(
        inputs=[[text]],
        model=settings.voyage_multimodal_model,
        input_type="document",
    )
    return result.embeddings[0]


async def generate_query_embedding(query: str) -> list[float]:
    """Generate embedding for search query using Voyage Multimodal.

    Uses multimodal model for compatibility with image+text document embeddings.
    """
    settings = get_settings()
    client = get_client()

    # Use multimodal model for query so it's compatible with multimodal document embeddings
    result = await client.multimodal_embed(
        inputs=[[query]],
        model=settings.voyage_multimodal_model,
        input_type="query",
    )
    return result.embeddings[0]


async def generate_multimodal_embedding(
    image_bytes: bytes,
    caption: str | None = None,
) -> list[float]:
    """Generate multimodal embedding for image + optional caption.

    Uses voyage-multimodal-3.5 for combined image+text understanding.

    Args:
        image_bytes: Raw image bytes
        caption: Optional text caption to embed alongside image

    Returns:
        1024-dimensional embedding vector
    """
    settings = get_settings()
    client = get_client()

    # Convert bytes to PIL Image
    image = Image.open(BytesIO(image_bytes))

    # Build multimodal input: [image] or [image, caption]
    inputs = [[image, caption]] if caption else [[image]]

    try:
        result = await client.multimodal_embed(
            inputs=inputs,
            model=settings.voyage_multimodal_model,
            input_type="document",
        )
        return result.embeddings[0]
    except Exception as e:
        logger.warning(f"Multimodal embedding failed: {e}, falling back to text-only")
        # Fallback to text embedding if multimodal fails
        if caption:
            return await generate_embedding(caption)
        raise


async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts."""
    if not texts:
        return []

    settings = get_settings()
    result = await get_client().embed(
        texts=texts,
        model=settings.voyage_text_model,
        input_type="document",
    )
    return result.embeddings


async def rerank(query: str, documents: list[str], top_k: int = 20) -> list[int]:
    """Re-rank documents using Voyage AI rerank-2.5 model.

    Args:
        query: The search query
        documents: List of document texts to re-rank
        top_k: Number of top results to return

    Returns:
        List of indices in order of relevance (most relevant first)
    """
    if not documents:
        return []

    settings = get_settings()
    client = get_client()

    try:
        result = await client.rerank(
            query=query,
            documents=documents,
            model=settings.voyage_rerank_model,
            top_k=min(top_k, len(documents)),
        )
        return [r.index for r in result.results]
    except Exception as e:
        logger.warning(f"Voyage rerank failed: {e}, returning original order")
        return list(range(min(top_k, len(documents))))
