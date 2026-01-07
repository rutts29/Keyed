from app.services import llm, embeddings, vector_db
from app.models.schemas import RecommendResponse, RecommendResult

TASTE_PROFILE_PROMPT = """Based on these liked content descriptions, describe the user's taste:
{descriptions}

Write 2-3 sentences about their preferences (themes, aesthetics, moods they enjoy)."""


async def recommend(
    user_wallet: str,
    liked_post_ids: list[str],
    limit: int = 50,
    exclude_seen: list[str] | None = None,
) -> RecommendResponse:
    """Generate personalized recommendations based on liked content."""
    await vector_db.ensure_collection()

    if not liked_post_ids:
        candidates = await vector_db.search_similar(
            embedding=[0.0] * 1024,
            limit=limit,
            exclude_ids=exclude_seen or [],
        )
        return RecommendResponse(
            recommendations=[
                RecommendResult(post_id=c["post_id"], score=c.get("score", 0), reason="Trending")
                for c in candidates[:limit]
            ],
            taste_profile=None,
        )

    liked_posts = await vector_db.get_posts_by_ids(liked_post_ids[-20:])
    if not liked_posts:
        return RecommendResponse(recommendations=[], taste_profile=None)

    descriptions = "\n".join(
        f"- {p.get('description', 'No description')}" for p in liked_posts if p.get("description")
    )

    taste_profile = await llm.generate_text(
        TASTE_PROFILE_PROMPT.format(descriptions=descriptions), use_thinking=False
    )

    taste_embedding = await embeddings.generate_query_embedding(taste_profile)

    exclude = set(exclude_seen or []) | set(liked_post_ids)
    candidates = await vector_db.search_similar(
        embedding=taste_embedding,
        limit=limit * 2,
        exclude_ids=list(exclude),
    )

    seen_creators: set[str] = set()
    diverse_results: list[dict] = []
    for c in candidates:
        creator = c.get("creator_wallet")
        if creator and creator in seen_creators and len(diverse_results) < limit // 2:
            continue
        if creator:
            seen_creators.add(creator)
        diverse_results.append(c)
        if len(diverse_results) >= limit:
            break

    return RecommendResponse(
        recommendations=[
            RecommendResult(
                post_id=c["post_id"],
                score=c.get("score", 0),
                reason="Similar to liked posts",
            )
            for c in diverse_results
        ],
        taste_profile=taste_profile,
    )
