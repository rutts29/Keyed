import time
from app.services import llm
from app.models.schemas import ModerationScores, ModerationResponse
from app.config import get_settings

MODERATION_PROMPT = """Analyze this image for content safety. Score each category 0-10:
- nsfw: Sexual/adult content
- violence: Gore, weapons in use
- hate: Hate symbols, slurs
- child_safety: Content involving minors inappropriately  
- spam: Obvious promotional/scam content
- drugs_weapons: Drug use, weapon sales

Return JSON: {"nsfw": X, "violence": X, "hate": X, "child_safety": X, "spam": X, "drugs_weapons": X, "explanation": "brief reason"}"""

THRESHOLDS = {
    "nsfw": 7,
    "violence": 6,
    "hate": 5,
    "child_safety": 3,
    "spam": 7,
    "drugs_weapons": 6,
}


def determine_verdict(scores: ModerationScores) -> tuple[str, str | None]:
    """Determine verdict and blocked category from scores."""
    scores_dict = scores.model_dump()
    for category, threshold in THRESHOLDS.items():
        if scores_dict.get(category, 0) > threshold:
            return "block", category

    for category, threshold in THRESHOLDS.items():
        if scores_dict.get(category, 0) > threshold * 0.6:
            return "warn", None

    return "allow", None


async def moderate_content(image_base64: str, caption: str | None = None) -> ModerationResponse:
    """Run moderation pipeline with optional escalation."""
    start_time = time.time()
    settings = get_settings()

    prompt = MODERATION_PROMPT
    if caption:
        prompt += f"\n\nCaption: {caption}"

    result = await llm.analyze_image(image_base64, prompt, use_thinking=False)

    scores = ModerationScores(
        nsfw=result.get("nsfw", 0),
        violence=result.get("violence", 0),
        hate=result.get("hate", 0),
        child_safety=result.get("child_safety", 0),
        spam=result.get("spam", 0),
        drugs_weapons=result.get("drugs_weapons", 0),
    )

    max_score = max(scores.model_dump().values())

    if max_score > settings.moderation_escalation_threshold:
        result = await llm.analyze_image(image_base64, prompt, use_thinking=True)
        scores = ModerationScores(
            nsfw=result.get("nsfw", 0),
            violence=result.get("violence", 0),
            hate=result.get("hate", 0),
            child_safety=result.get("child_safety", 0),
            spam=result.get("spam", 0),
            drugs_weapons=result.get("drugs_weapons", 0),
        )
        max_score = max(scores.model_dump().values())

    verdict, blocked_category = determine_verdict(scores)
    processing_time_ms = int((time.time() - start_time) * 1000)

    return ModerationResponse(
        verdict=verdict,
        scores=scores,
        max_score=max_score,
        explanation=result.get("explanation", ""),
        processing_time_ms=processing_time_ms,
        blocked_category=blocked_category,
        violation_id=None,
    )
