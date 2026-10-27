"""Weighted overall score. Weights come from the project synopsis.

Phase 1 only measures four text criteria, so the available weights are renormalised.
(Speech fluency and visual engagement join in later phases.)
"""
WEIGHTS = {
    "technical": 0.30,
    "relevance": 0.20,
    "communication": 0.15,
    "problem_solving": 0.15,
    "speech_fluency": 0.10,
    "visual_engagement": 0.10,
}


def overall_score(scores: dict) -> float:
    present = {k: v for k, v in scores.items() if k in WEIGHTS and v is not None}
    total_w = sum(WEIGHTS[k] for k in present)
    if total_w == 0:
        return 0.0
    return round(sum(WEIGHTS[k] * present[k] for k in present) / total_w, 1)
