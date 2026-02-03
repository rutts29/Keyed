import json
import asyncio
import logging
from google import genai
from google.genai import types
from openai import AsyncOpenAI
from fastapi import HTTPException
from app.config import get_settings

logger = logging.getLogger(__name__)

# Default timeout for API calls (in seconds)
GEMINI_TIMEOUT_SECONDS = 60

_gemini_client: genai.Client | None = None
_openai_client: AsyncOpenAI | None = None


def _get_gemini_client() -> genai.Client:
    """Get or create Gemini client."""
    global _gemini_client
    if _gemini_client is None:
        settings = get_settings()
        _gemini_client = genai.Client(api_key=settings.gemini_api_key)
    return _gemini_client


def _get_openai_client() -> AsyncOpenAI:
    """Get or create OpenAI client (for moderation)."""
    global _openai_client
    if _openai_client is None:
        settings = get_settings()
        _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai_client


def _get_model_name() -> str:
    """Get the Gemini model name."""
    settings = get_settings()
    return settings.gemini_model  # gemini-3-flash-preview


async def generate_text(prompt: str, use_thinking: bool = False) -> str:
    """Generate text using Gemini.

    Args:
        prompt: Text prompt
        use_thinking: Ignored (kept for API compatibility)

    Returns:
        Generated text response
    """
    client = _get_gemini_client()
    model_name = _get_model_name()

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


async def moderate_with_openai(image_base64: str, caption: str | None = None) -> dict:
    """Moderate content using OpenAI omni-moderation-latest (FREE).

    Args:
        image_base64: Base64 encoded image (with or without data: prefix)
        caption: Optional text caption to moderate alongside image

    Returns:
        OpenAI moderation result object
    """
    client = _get_openai_client()
    settings = get_settings()

    # Ensure proper data URI format for OpenAI
    if not image_base64.startswith("data:"):
        image_base64 = f"data:image/jpeg;base64,{image_base64}"

    # Build input array
    inputs = []
    inputs.append({
        "type": "image_url",
        "image_url": {"url": image_base64}
    })

    if caption:
        inputs.append({
            "type": "text",
            "text": caption
        })

    try:
        response = await asyncio.wait_for(
            client.moderations.create(
                model=settings.openai_moderation_model,
                input=inputs,
            ),
            timeout=GEMINI_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Moderation request timed out. Please try again."
        )

    return response.results[0]
