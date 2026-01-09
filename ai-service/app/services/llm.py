import json
import base64
import google.generativeai as genai
from app.config import get_settings

_configured = False


def _configure_gemini():
    """Configure Gemini API client."""
    global _configured
    if not _configured:
        settings = get_settings()
        genai.configure(api_key=settings.gemini_api_key)
        _configured = True


def _get_model(use_thinking: bool = False):
    """Get the appropriate Gemini model."""
    _configure_gemini()
    settings = get_settings()
    model_name = settings.gemini_pro_model if use_thinking else settings.gemini_flash_model
    return genai.GenerativeModel(model_name)


async def analyze_image(image_base64: str, prompt: str, use_thinking: bool = False) -> dict:
    """Analyze image using Gemini Vision.
    
    Args:
        image_base64: Base64 encoded image (can include data:image prefix or raw base64)
        prompt: Analysis prompt
        use_thinking: Use Pro model for complex reasoning
        
    Returns:
        Parsed JSON response from Gemini
    """
    model = _get_model(use_thinking)
    
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
    image_part = {
        "mime_type": mime_type,
        "data": base64.b64decode(image_data)
    }
    
    # Generate response with JSON output
    generation_config = genai.GenerationConfig(
        response_mime_type="application/json",
        max_output_tokens=1000,
    )
    
    response = await model.generate_content_async(
        [prompt, image_part],
        generation_config=generation_config,
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
    model = _get_model(use_thinking)
    
    generation_config = genai.GenerationConfig(
        max_output_tokens=500,
    )
    
    response = await model.generate_content_async(
        prompt,
        generation_config=generation_config,
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
Only include the top {top_k} most relevant results."""

    model = _get_model(use_thinking=True)
    
    generation_config = genai.GenerationConfig(
        response_mime_type="application/json",
        max_output_tokens=500,
    )
    
    response = await model.generate_content_async(
        prompt,
        generation_config=generation_config,
    )

    try:
        result = json.loads(response.text)
    except json.JSONDecodeError:
        # Fallback: return original order
        return items[:top_k]
    
    rankings = result.get("rankings", [])

    items_by_id = {item["post_id"]: item for item in items}
    reranked = []
    for post_id in rankings:
        if post_id in items_by_id:
            reranked.append(items_by_id[post_id])
    
    return reranked
