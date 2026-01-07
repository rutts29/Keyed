from app.services import llm, embeddings, vector_db
from app.models.schemas import SearchResponse, SearchResult

QUERY_EXPANSION_PROMPT = """Expand this search query into a visual description for image search.
Query: "{query}"
Describe what images would match: subjects, settings, mood, visual elements.
Be specific in 2-3 sentences."""


async def search(query: str, limit: int = 50, rerank: bool = True) -> SearchResponse:
    """Semantic search pipeline with optional re-ranking."""
    expanded = await llm.generate_text(
        QUERY_EXPANSION_PROMPT.format(query=query), use_thinking=False
    )

    embedding = await embeddings.generate_query_embedding(f"{query} {expanded}")

    await vector_db.ensure_collection()
    candidates = await vector_db.search_similar(embedding, limit=limit * 2 if rerank else limit)

    if rerank and candidates:
        candidates = await llm.rerank_results(query, candidates, top_k=limit)

    results = [
        SearchResult(
            post_id=c["post_id"],
            score=c.get("score", 0),
            description=c.get("description"),
            creator_wallet=c.get("creator_wallet"),
        )
        for c in candidates[:limit]
    ]

    return SearchResponse(results=results, expanded_query=expanded)
