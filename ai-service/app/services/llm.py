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
    import base64 as b64_module
    import re

    client = _get_openai_client()
    settings = get_settings()

    # Handle data URI - extract mime type and base64 if present
    existing_mime = None
    if image_base64.startswith("data:"):
        match = re.match(r'data:([^;]+);base64,(.+)', image_base64, re.DOTALL)
        if match:
            existing_mime = match.group(1)
            image_base64 = match.group(2)
            logger.info(f"Extracted existing MIME type from data URI: {existing_mime}")

    # Clean up base64 string - remove any whitespace/newlines
    image_base64 = image_base64.strip().replace('\n', '').replace('\r', '').replace(' ', '')

    # Validate base64 string
    base64_pattern = re.compile(r'^[A-Za-z0-9+/]*={0,2}$')
    if not base64_pattern.match(image_base64):
        logger.error("Invalid base64 characters detected")
        raise HTTPException(status_code=400, detail="Invalid base64 encoding")

    # Check approximate size (base64 is ~4/3 of original size)
    approx_size_mb = (len(image_base64) * 3 / 4) / (1024 * 1024)
    logger.info(f"Moderation request - base64 length: {len(image_base64)}, approx size: {approx_size_mb:.2f}MB")

    if approx_size_mb > 20:
        logger.error(f"Image too large: {approx_size_mb:.2f}MB (max 20MB)")
        raise HTTPException(status_code=400, detail="Image too large (max 20MB)")

    # Detect image format from base64 magic bytes if not already known
    mime_type = existing_mime or "image/jpeg"  # Default
    if not existing_mime:
        try:
            # Need at least 16 chars of base64 to decode enough bytes for detection
            if len(image_base64) >= 16:
                # Add padding for safe decoding
                padded = image_base64[:32]
                padding_needed = (4 - len(padded) % 4) % 4
                padded += '=' * padding_needed
                raw_bytes = b64_module.b64decode(padded)
                logger.info(f"First 16 bytes hex: {raw_bytes[:16].hex() if len(raw_bytes) >= 16 else raw_bytes.hex()}")

                if len(raw_bytes) >= 8 and raw_bytes[:8] == b'\x89PNG\r\n\x1a\n':
                    mime_type = "image/png"
                elif len(raw_bytes) >= 2 and raw_bytes[:2] == b'\xff\xd8':
                    mime_type = "image/jpeg"
                elif len(raw_bytes) >= 6 and raw_bytes[:6] in (b'GIF87a', b'GIF89a'):
                    mime_type = "image/gif"
                elif len(raw_bytes) >= 12 and raw_bytes[:4] == b'RIFF' and raw_bytes[8:12] == b'WEBP':
                    mime_type = "image/webp"

                logger.info(f"Detected MIME type: {mime_type}")
        except Exception as e:
            logger.warning(f"Failed to detect image format: {e}")

    # Build final data URI
    data_uri = f"data:{mime_type};base64,{image_base64}"
    logger.info(f"Final data URI prefix: {data_uri[:60]}...")

    # Build input array
    inputs = []
    inputs.append({
        "type": "image_url",
        "image_url": {"url": data_uri}
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
        logger.info("OpenAI moderation successful")
        return response.results[0]
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Moderation request timed out. Please try again."
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"OpenAI moderation failed: {error_msg}")
        # Check if it's an API error with more details
        if hasattr(e, 'response'):
            try:
                error_body = e.response.json() if hasattr(e.response, 'json') else str(e.response)
                logger.error(f"OpenAI API error body: {error_body}")
            except:
                pass
        raise HTTPException(
            status_code=502,
            detail=f"Content moderation service error: {error_msg}"
        )
