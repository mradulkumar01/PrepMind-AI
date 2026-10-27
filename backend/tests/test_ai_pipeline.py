import json

import pytest

from app.services.evaluator import evaluate_answer
from app.services.llm import LLMBadOutput, LLMClient, MockClient
from app.services.question_generator import generate_followup, generate_question


class FakeLLM(LLMClient):
    name = "fake"

    def __init__(self, outputs):
        self.outputs, self.calls = list(outputs), 0

    def complete(self, system, user, *, task, hints=None):
        self.calls += 1
        return self.outputs.pop(0)


def test_question_generation_with_mock():
    q = generate_question(MockClient(), kind="technical", topic="Python", difficulty="hard",
                          excerpts=["Built APIs in Python"], jd_excerpts=[], previous_questions=[])
    assert "Python" in q["text"] and len(q["expected_points"]) >= 3


def test_followup_with_mock():
    q = {"text": "What is X?", "expected_points": ["a"]}
    assert generate_followup(MockClient(), question=q, answer_text="idk", topic="X")["text"]


def test_evaluator_clamps_scores():
    raw = json.dumps({"technical": 150, "relevance": -5, "communication": "80", "problem_solving": 55.6,
                      "feedback": "ok", "strengths": ["a"], "improvements": ["b"]})
    r = evaluate_answer(FakeLLM([raw]), question_text="q", expected_points=["p"], answer_text="a")
    assert r["scores"] == {"technical": 100, "relevance": 0, "communication": 80, "problem_solving": 56}
    assert r["evaluator"] == "fake"


def test_evaluator_retries_once_then_succeeds():
    good = json.dumps({"technical": 1, "relevance": 2, "communication": 3, "problem_solving": 4})
    llm = FakeLLM(["I cannot comply", good])
    assert evaluate_answer(llm, question_text="q", expected_points=[], answer_text="a")["scores"]["technical"] == 1
    assert llm.calls == 2


def test_evaluator_gives_up_after_two_bad_outputs():
    with pytest.raises(LLMBadOutput):
        evaluate_answer(FakeLLM(["nope", '{"technical": "abc"}']), question_text="q", expected_points=[], answer_text="a")


def test_question_generator_rejects_missing_fields():
    with pytest.raises(LLMBadOutput):
        generate_question(FakeLLM(['{"question": ""}', '{"topic": "x"}']), kind="hr", topic="t", difficulty="easy",
                          excerpts=[], jd_excerpts=[], previous_questions=[])


def test_mock_evaluation_rewards_longer_relevant_answers():
    pts = ["clear definition of caching", "trade-offs"]
    short = evaluate_answer(MockClient(), question_text="q", expected_points=pts, answer_text="idk")
    long = evaluate_answer(MockClient(), question_text="q", expected_points=pts,
                           answer_text=("Caching stores results; the trade-offs include stale data. " * 12))
    assert long["scores"]["technical"] > short["scores"]["technical"]
