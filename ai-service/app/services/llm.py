import json
from openai import AsyncOpenAI
from app.config import get_settings

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def analyze_image(image_base64: str, prompt: str, use_thinking: bool = False) -> dict:
    """Analyze image using GPT 5.2 Vision."""
    settings = get_settings()
    model = settings.gpt_thinking_model if use_thinking else settings.gpt_instant_model

    response = await get_client().chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_base64}},
                ],
            }
        ],
        response_format={"type": "json_object"},
        max_tokens=1000,
    )

    return json.loads(response.choices[0].message.content)


async def generate_text(prompt: str, use_thinking: bool = False) -> str:
    """Generate text using GPT 5.2."""
    settings = get_settings()
    model = settings.gpt_thinking_model if use_thinking else settings.gpt_instant_model

    response = await get_client().chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
    )

    return response.choices[0].message.content


async def rerank_results(query: str, items: list[dict], top_k: int = 20) -> list[dict]:
    """Re-rank search results for relevance using GPT 5.2 Thinking."""
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

    response = await get_client().chat.completions.create(
        model=get_settings().gpt_thinking_model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=500,
    )

    result = json.loads(response.choices[0].message.content)
    rankings = result.get("rankings", [])

    items_by_id = {item["post_id"]: item for item in items}
    reranked = []
    for post_id in rankings:
        if post_id in items_by_id:
            reranked.append(items_by_id[post_id])
    return reranked
