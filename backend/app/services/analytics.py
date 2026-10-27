"""Interview summary: per-topic and per-criterion averages, strengths and weaknesses."""
from collections import defaultdict

CRITERIA = ["technical", "relevance", "communication", "problem_solving"]


def summarize(rows: list[dict], strong: float = 70, weak: float = 50) -> dict:
    """rows: [{"topic": str, "scores": {...}, "overall": float}, ...]"""
    if not rows:
        return {"answered": 0, "overall": 0.0, "by_topic": {}, "criteria_avg": {}, "strengths": [], "weaknesses": []}
    by_topic: dict[str, list[float]] = defaultdict(list)
    crit: dict[str, list[float]] = defaultdict(list)
    for r in rows:
        by_topic[r["topic"]].append(r["overall"])
        for c in CRITERIA:
            if r["scores"].get(c) is not None:
                crit[c].append(r["scores"][c])
    topic_avg = {t: round(sum(v) / len(v), 1) for t, v in by_topic.items()}
    return {
        "answered": len(rows),
        "overall": round(sum(r["overall"] for r in rows) / len(rows), 1),
        "by_topic": topic_avg,
        "criteria_avg": {c: round(sum(v) / len(v), 1) for c, v in crit.items()},
        "strengths": sorted([t for t, s in topic_avg.items() if s >= strong], key=lambda t: -topic_avg[t]),
        "weaknesses": sorted([t for t, s in topic_avg.items() if s <= weak], key=lambda t: topic_avg[t]),
    }
