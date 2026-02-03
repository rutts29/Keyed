import time
import logging
from app.services import llm
from app.models.schemas import ModerationScores, ModerationResponse

logger = logging.getLogger(__name__)

# Map OpenAI categories to our score format
# OpenAI returns scores 0-1, we convert to 0-10
CATEGORY_MAPPING = {
    "sexual": "nsfw",
    "sexual/minors": "child_safety",
    "harassment": "hate",
    "harassment/threatening": "hate",
    "hate": "hate",
    "hate/threatening": "hate",
    "violence": "violence",
    "violence/graphic": "violence",
    "self-harm": "drugs_weapons",
    "self-harm/intent": "drugs_weapons",
    "self-harm/instructions": "drugs_weapons",
    "illicit": "drugs_weapons",
    "illicit/violent": "violence",
}

# Thresholds tuned for FREE SPEECH with protection against extreme content
# Higher = more permissive (scale 0-10)
# Philosophy: Allow hyperbole, heated opinions, and genuine emotions
# Only block truly dangerous/illegal content
THRESHOLDS = {
    "nsfw": 8.5,        # Block explicit porn, allow suggestive/artistic
    "violence": 8.5,    # Block real threats/gore, allow hyperbole ("I could kill for pizza")
    "hate": 9.0,        # Block targeted slurs/calls to harm, allow heated political debate
    "child_safety": 2,  # STRICT - non-negotiable, protect minors
    "spam": 8.5,        # Block obvious spam/scams
    "drugs_weapons": 9.5, # Block actual sales/instructions, allow hyperbole like "I could kill myself"
}


def _map_openai_scores(openai_result) -> ModerationScores:
    """Map OpenAI moderation result to our ModerationScores format."""
    scores = {
        "nsfw": 0.0,
        "violence": 0.0,
        "hate": 0.0,
        "child_safety": 0.0,
        "spam": 0.0,
        "drugs_weapons": 0.0,
    }

    category_scores = openai_result.category_scores

    for openai_cat, our_cat in CATEGORY_MAPPING.items():
        attr_name = openai_cat.replace("/", "_").replace("-", "_")
        openai_score = getattr(category_scores, attr_name, 0) or 0
        score_10 = float(openai_score) * 10.0
        scores[our_cat] = max(scores[our_cat], score_10)

    return ModerationScores(**scores)


def _generate_explanation(openai_result, scores: ModerationScores) -> str:
    """Generate human-readable explanation."""
    categories = openai_result.categories
    flagged = []

    # Only check known OpenAI moderation categories
    openai_categories = [
        "sexual", "sexual_minors", "harassment", "harassment_threatening",
        "hate", "hate_threatening", "violence", "violence_graphic",
        "self_harm", "self_harm_intent", "self_harm_instructions",
        "illicit", "illicit_violent"
    ]

    for cat in openai_categories:
        if getattr(categories, cat, False):
            flagged.append(cat.replace("_", "/"))

    if not flagged:
        return "Content appears safe."

    scores_dict = scores.model_dump()
    max_cat = max(scores_dict, key=scores_dict.get)
    max_score = scores_dict[max_cat]

    return f"Flagged for: {', '.join(flagged)}. Highest: {max_cat}={max_score:.1f}/10"


def determine_verdict(scores: ModerationScores) -> tuple[str, str | None]:
    """Determine verdict and blocked category from scores.

    Only two outcomes that affect posting:
    - "allow" = post goes through (includes warnings)
    - "block" = post rejected (only for extreme content)

    "warn" is informational only - post still allowed.
    """
    scores_dict = scores.model_dump()

    # Only block truly extreme content
    for category, threshold in THRESHOLDS.items():
        if scores_dict.get(category, 0) > threshold:
            return "block", category

    # Warn is informational - post still allowed
    # Can be used for UI hints or logging, but doesn't prevent posting
    for category, threshold in THRESHOLDS.items():
        if scores_dict.get(category, 0) > threshold * 0.8:
            return "warn", None

    return "allow", None


async def moderate_content(image_base64: str, caption: str | None = None) -> ModerationResponse:
    """Run moderation using OpenAI omni-moderation-latest (FREE)."""
    start_time = time.time()

    openai_result = await llm.moderate_with_openai(image_base64, caption)

    scores = _map_openai_scores(openai_result)
    max_score = max(scores.model_dump().values())
    explanation = _generate_explanation(openai_result, scores)
    verdict, blocked_category = determine_verdict(scores)

    processing_time_ms = int((time.time() - start_time) * 1000)

    return ModerationResponse(
        verdict=verdict,
        scores=scores,
        max_score=max_score,
        explanation=explanation,
        processing_time_ms=processing_time_ms,
        blocked_category=blocked_category,
        violation_id=None,
    )
