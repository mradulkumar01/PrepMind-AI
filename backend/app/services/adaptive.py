"""Adaptive difficulty: move up/down based on the average of the most recent answers."""
LEVELS = ["easy", "medium", "hard"]


def next_difficulty(current: str, recent_scores: list[float], window: int = 2, up: float = 75, down: float = 45) -> str:
    if current not in LEVELS:
        current = "medium"
    if not recent_scores:
        return current
    tail = recent_scores[-window:]
    avg = sum(tail) / len(tail)
    i = LEVELS.index(current)
    if avg >= up:
        i = min(i + 1, len(LEVELS) - 1)
    elif avg <= down:
        i = max(i - 1, 0)
    return LEVELS[i]
