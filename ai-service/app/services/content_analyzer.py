from app.services import llm, embeddings, vector_db
from app.models.schemas import AnalyzeResponse
from app.utils.image import download_image, image_to_base64
from app.config import get_settings

ANALYSIS_PROMPT = """Analyze this image for social media indexing. Provide JSON:
{
  "description": "2-3 sentence description",
  "tags": ["5-10 relevant tags"],
  "scene_type": "indoor/outdoor/urban/nature/portrait/food/etc",
  "objects": ["main objects visible"],
  "mood": "emotional tone/atmosphere",
  "colors": ["dominant colors"],
  "safety_score": 0-10 (0=unsafe, 10=safe),
  "alt_text": "accessibility description"
}"""


async def analyze_content(
    content_uri: str,
    caption: str | None = None,
    post_id: str | None = None,
    creator_wallet: str | None = None,
) -> AnalyzeResponse:
    """Full content analysis pipeline."""
    settings = get_settings()

    image_bytes = await download_image(content_uri, settings.ipfs_gateway)
    image_base64 = image_to_base64(image_bytes)

    prompt = ANALYSIS_PROMPT
    if caption:
        prompt += f"\n\nCaption: {caption}"

    result = await llm.analyze_image(image_base64, prompt, use_thinking=False)

    description = result.get("description", "")
    embed_text = f"{description} {caption or ''}".strip()
    embedding = await embeddings.generate_embedding(embed_text)

    if post_id:
        await vector_db.ensure_collection()
        await vector_db.upsert_post(
            post_id=post_id,
            embedding=embedding,
            payload={
                "description": description,
                "caption": caption,
                "tags": result.get("tags", []),
                "scene_type": result.get("scene_type", "unknown"),
                "mood": result.get("mood", ""),
                "creator_wallet": creator_wallet,
                "timestamp": 0,
            },
        )

    return AnalyzeResponse(
        description=description,
        tags=result.get("tags", []),
        scene_type=result.get("scene_type", "unknown"),
        objects=result.get("objects", []),
        mood=result.get("mood", ""),
        colors=result.get("colors", []),
        safety_score=result.get("safety_score", 10),
        alt_text=result.get("alt_text", ""),
        embedding=embedding,
    )
