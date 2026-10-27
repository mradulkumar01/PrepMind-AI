from app.services.adaptive import next_difficulty
from app.services.scoring import overall_score


def test_moves_up_on_strong_answers():
    assert next_difficulty("medium", [80, 90]) == "hard"


def test_moves_down_on_weak_answers():
    assert next_difficulty("medium", [30, 40]) == "easy"


def test_stays_in_middle_band_and_at_edges():
    assert next_difficulty("medium", [60, 60]) == "medium"
    assert next_difficulty("hard", [95, 95]) == "hard"
    assert next_difficulty("easy", [5, 5]) == "easy"


def test_uses_only_recent_window():
    assert next_difficulty("medium", [10, 10, 10, 90, 90]) == "hard"


def test_no_scores_keeps_level():
    assert next_difficulty("easy", []) == "easy"


def test_overall_renormalises_available_weights():
    s = {"technical": 100, "relevance": 100, "communication": 100, "problem_solving": 100}
    assert overall_score(s) == 100.0
    assert overall_score({"technical": 80, "relevance": 40}) == 64.0  # (0.3*80+0.2*40)/0.5


def test_overall_empty_and_none():
    assert overall_score({}) == 0.0
    assert overall_score({"technical": None}) == 0.0
