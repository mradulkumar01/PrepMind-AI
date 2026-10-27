"""LLM access behind one tiny interface.

- OpenAICompatibleClient: any server exposing /v1/chat/completions (Ollama, llama.cpp, vLLM, Groq...).
  Works with Llama models; the model name comes from .env.
- MockClient: deterministic heuristics so the UI can be demoed without a GPU.
  It is NOT an AI judgement and results are tagged "mock-heuristic".
"""
import re


class LLMError(RuntimeError):
    pass


class LLMUnavailable(LLMError):
    """LLM server unreachable or returned an error."""


class LLMBadOutput(LLMError):
    """LLM replied, but not in the JSON shape we asked for."""


class LLMClient:
    name = "base"

    def complete(self, system: str, user: str, *, task: str, hints: dict | None = None) -> str:
        raise NotImplementedError


class OpenAICompatibleClient(LLMClient):
    def __init__(self, base_url: str, model: str, api_key: str, timeout: float = 120.0):
        self.base_url, self.model, self.api_key, self.timeout = base_url.rstrip("/"), model, api_key, timeout
        self.name = model

    def complete(self, system: str, user: str, *, task: str, hints: dict | None = None) -> str:
        import httpx

        try:
            r = httpx.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    "temperature": 0.4,
                    "max_tokens": 700,
                },
                timeout=self.timeout,
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
            raise LLMUnavailable(f"LLM request failed: {exc.__class__.__name__}") from exc


_MOCK_QUESTIONS = {
    "technical": {
        "easy": "In your own words, what is {topic} and where have you used it?",
        "medium": "Describe a problem you solved using {topic}. What trade-offs did you consider?",
        "hard": "How would you design and debug a production-grade system that relies heavily on {topic}?",
    },
    "project": {
        "easy": "Give a short overview of one project on your resume and your role in it.",
        "medium": "What was the hardest technical decision in your project, and why did you choose that approach?",
        "hard": "If your project had to handle 100x more users, what would you change first and why?",
    },
    "hr": {
        "easy": "Tell me about a time involving {topic}.",
        "medium": "Describe a situation about {topic}: what did you do and what was the result?",
        "hard": "Tell me about a time you faced a difficult decision around {topic}. What would you do differently now?",
    },
}


class MockClient(LLMClient):
    name = "mock-heuristic"

    def complete(self, system: str, user: str, *, task: str, hints: dict | None = None) -> str:
        import json

        h = hints or {}
        if task == "question":
            kind, diff = h.get("kind", "technical"), h.get("difficulty", "medium")
            text = _MOCK_QUESTIONS.get(kind, _MOCK_QUESTIONS["technical"])[diff].format(topic=h.get("topic", "this topic"))
            return json.dumps({
                "question": text,
                "topic": h.get("topic", "general"),
                "expected_points": ["clear definition", "a concrete example", "trade-offs or results", "lessons learned"],
            })
        if task == "followup":
            return json.dumps({
                "question": "Can you go deeper and give a concrete example of that?",
                "topic": h.get("topic", "general"),
                "expected_points": ["specific example", "reasoning", "outcome"],
            })
        # evaluate: crude keyword-coverage + length heuristic
        answer = (h.get("answer") or "").lower()
        points = h.get("expected_points") or []
        words = len(answer.split())
        covered = 0
        for p in points:
            keys = [w for w in re.findall(r"[a-z]{4,}", p.lower())]
            if keys and any(k in answer for k in keys):
                covered += 1
        coverage = covered / len(points) if points else 0.0
        length = min(words / 80, 1.0)
        base = int(100 * (0.5 * coverage + 0.5 * length))
        return json.dumps({
            "technical": base, "relevance": min(100, base + 10), "communication": int(100 * length),
            "problem_solving": base,
            "feedback": "Mock mode: this score comes from answer length and keyword overlap, not from an AI judgement.",
            "strengths": ["Provided an answer"] if words >= 20 else [],
            "improvements": ["Add concrete examples", "Explain your reasoning step by step"],
            "sample_answer": "A strong answer would define the key idea, explain your reasoning, connect it to a relevant example, and describe the result. Replace this outline with details from your own experience.",
        })


def get_llm() -> LLMClient:
    from app.core.config import get_settings

    s = get_settings()
    if s.llm_provider == "mock":
        return MockClient()
    return OpenAICompatibleClient(s.llm_base_url, s.llm_model, s.llm_api_key)
