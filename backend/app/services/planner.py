"""Decide WHICH topic each question covers (plain code, so it is predictable and easy to defend).
The LLM only phrases the question; it does not choose coverage."""

HR_THEMES = [
    "teamwork and conflict", "handling failure", "leadership and initiative",
    "time management under pressure", "motivation and career goals", "adaptability and learning",
]
MIXED_ORDER = ["technical", "project", "hr"]


def plan_topic(interview_type: str, index: int, skills: list[str]) -> tuple[str, str]:
    """Return (kind, topic) for the index-th main (non-follow-up) question."""
    kind = MIXED_ORDER[index % len(MIXED_ORDER)] if interview_type == "mixed" else interview_type
    if kind == "hr":
        return kind, HR_THEMES[(index // (3 if interview_type == "mixed" else 1)) % len(HR_THEMES)]
    if kind == "project":
        return kind, "projects listed on the resume"
    pool = skills or ["general software engineering"]
    step = index // 3 if interview_type == "mixed" else index
    return kind, pool[step % len(pool)]
