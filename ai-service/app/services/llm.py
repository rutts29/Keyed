import json
import base64
import asyncio
import logging
from google import genai
from google.genai import types
from fastapi import HTTPException
from app.config import get_settings

logger = logging.getLogger(__name__)

# Default timeout for Gemini API calls (in seconds)
GEMINI_TIMEOUT_SECONDS = 60

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """Get or create Gemini client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def _get_model_name(use_thinking: bool = False) -> str:
    """Get the appropriate model name."""
    settings = get_settings()
    return settings.gemini_pro_model if use_thinking else settings.gemini_flash_model


async def analyze_image(image_base64: str, prompt: str, use_thinking: bool = False) -> dict:
    """Analyze image using Gemini Vision.
    
    Args:
        image_base64: Base64 encoded image (can include data:image prefix or raw base64)
        prompt: Analysis prompt
        use_thinking: Use Pro model for complex reasoning
        
    Returns:
        Parsed JSON response from Gemini
    """
    client = _get_client()
    model_name = _get_model_name(use_thinking)
    
    # Handle base64 format - strip data URL prefix if present
    if image_base64.startswith("data:"):
        # Format: data:image/jpeg;base64,/9j/4AAQ...
        header, image_data = image_base64.split(",", 1)
        mime_type = header.split(":")[1].split(";")[0]
    else:
        # Assume JPEG if no prefix
        image_data = image_base64
        mime_type = "image/jpeg"
    
    # Create image part for Gemini
    image_bytes = base64.b64decode(image_data)
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    
    # Add JSON instruction to prompt
    json_prompt = f"{prompt}\n\nRespond with valid JSON only, no markdown formatting."
    
    # Generate response with timeout
    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=model_name,
                contents=[json_prompt, image_part],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    max_output_tokens=1000,
                ),
            ),
            timeout=GEMINI_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Image analysis request timed out. Please try again."
        )
    
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        # If JSON parsing fails, try to extract JSON from response
        text = response.text
        if "{" in text and "}" in text:
            start = text.index("{")
            end = text.rindex("}") + 1
            return json.loads(text[start:end])
        raise ValueError(f"Failed to parse JSON from Gemini response: {text[:200]}")


async def generate_text(prompt: str, use_thinking: bool = False) -> str:
    """Generate text using Gemini.
    
    Args:
        prompt: Text prompt
        use_thinking: Use Pro model for complex reasoning
        
    Returns:
        Generated text response
    """
    client = _get_client()
    model_name = _get_model_name(use_thinking)

    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=500,
                ),
            ),
            timeout=GEMINI_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Text generation request timed out. Please try again."
        )

    return response.text


async def rerank_results(query: str, items: list[dict], top_k: int = 20) -> list[dict]:
    """Re-rank search results for relevance using Gemini Pro.
    
    Args:
        query: Search query
        items: List of search result items with post_id and description
        top_k: Number of top results to return
        
    Returns:
        Re-ranked list of items
    """
    if not items:
        return []

    items_text = "\n".join(
        f"{i+1}. [ID: {item['post_id']}] {item.get('description', 'No description')}"
        for i, item in enumerate(items[:50])
    )

    prompt = f"""Re-rank these search results by relevance to the query.
Query: "{query}"

Results:
{items_text}

Return JSON with "rankings" array of post_id strings in order of relevance (most relevant first).
Only include the top {top_k} most relevant results.

Respond with valid JSON only."""

    client = _get_client()
    model_name = _get_model_name(use_thinking=True)

    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    max_output_tokens=500,
                ),
            ),
            timeout=GEMINI_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        logger.warning(f"Reranking timed out for query '{query[:50]}', falling back to original order")
        return items[:top_k]

    try:
        result = json.loads(response.text)
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse rerank response: {e}, response: {response.text[:200]}")
        return items[:top_k]
    
    rankings = result.get("rankings", [])

    items_by_id = {item["post_id"]: item for item in items}
    reranked = []
    for post_id in rankings:
        if post_id in items_by_id:
            reranked.append(items_by_id[post_id])
    
    return reranked
