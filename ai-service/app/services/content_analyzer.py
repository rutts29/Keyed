import logging
from app.services import embeddings, vector_db
from app.models.schemas import AnalyzeResponse
from app.utils.image import download_image
from app.config import get_settings

logger = logging.getLogger(__name__)


async def analyze_content(
    content_uri: str,
    caption: str | None = None,
    post_id: str | None = None,
    creator_wallet: str | None = None,
) -> AnalyzeResponse:
    """Analyze content using Voyage AI multimodal embeddings.

    Downloads the image and generates a combined image+text embedding
    using voyage-multimodal-3.5 for semantic search.
    """
    settings = get_settings()
    description = caption or "Image content"
    embedding = None

    # Download image and generate multimodal embedding
    if content_uri:
        try:
            image_bytes = await download_image(content_uri, settings.ipfs_gateway)
            embedding = await embeddings.generate_multimodal_embedding(
                image_bytes=image_bytes,
                caption=caption,
            )
            logger.info(f"Generated multimodal embedding for post {post_id}")
        except Exception as e:
            logger.warning(f"Multimodal embedding failed: {e}, trying text-only")
            # Fallback to text embedding if image processing fails
            if caption:
                try:
                    embedding = await embeddings.generate_embedding(caption)
                except Exception as e2:
                    logger.warning(f"Text embedding also failed: {e2}")
    elif caption:
        # Text-only post - use text embedding
        try:
            embedding = await embeddings.generate_embedding(caption)
        except Exception as e:
            logger.warning(f"Failed to generate text embedding: {e}")

    # Store in vector DB if post_id provided and we have an embedding
    if post_id and embedding:
        try:
            await vector_db.ensure_collection()
            await vector_db.upsert_post(
                post_id=post_id,
                embedding=embedding,
                payload={
                    "description": description,
                    "caption": caption,
                    "tags": [],
                    "scene_type": "unknown",
                    "mood": "neutral",
                    "creator_wallet": creator_wallet,
                    "timestamp": 0,
                },
            )
            logger.info(f"Stored embedding for post {post_id} in Qdrant")
        except Exception as e:
            logger.warning(f"Failed to store in vector DB: {e}")

    return AnalyzeResponse(
        description=description,
        tags=[],
        scene_type="unknown",
        objects=[],
        mood="neutral",
        colors=[],
        safety_score=10,
        alt_text=caption or "Image",
        embedding=embedding,
    )
