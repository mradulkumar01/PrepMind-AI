"""Judge0-compatible sandbox client. User code never runs in the PrepMind process."""
import asyncio
import base64
import time

import httpx

from app.core.config import get_settings
from app.services.arena_catalog import LANGUAGES


class JudgeUnavailable(RuntimeError):
    pass


class JudgeTimeout(RuntimeError):
    pass


STATUS_MAP = {
    3: "Accepted", 4: "Wrong Answer", 5: "Time Limit Exceeded", 6: "Compilation Error",
    7: "Runtime Error", 8: "Runtime Error", 9: "Runtime Error", 10: "Runtime Error",
    11: "Runtime Error", 12: "Runtime Error", 13: "Internal Error", 14: "Runtime Error",
}


def normalize_verdict(status_id: int | None, description: str = "") -> str:
    """Translate Judge0's status into the stable verdict vocabulary shown to users."""
    if "memory" in description.lower():
        return "Memory Limit Exceeded"
    return STATUS_MAP.get(status_id, description or "Internal Error")


def _b64(value: str | None) -> str:
    return base64.b64decode(value or "").decode("utf-8", errors="replace")


def _settings():
    settings = get_settings()
    if not settings.judge0_url.strip():
        raise JudgeUnavailable("Code execution is not configured. Add the Judge0 settings to backend/.env.")
    return settings


def _headers(settings) -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if settings.judge0_api_key:
        headers[settings.judge0_api_key_header] = settings.judge0_api_key
    if settings.judge0_host:
        headers["X-RapidAPI-Host"] = settings.judge0_host
    return headers


async def execute(code: str, language: str, stdin: str = "") -> dict:
    """Submit one isolated execution and poll Judge0 until it has a terminal verdict."""
    settings = _settings()
    lang = LANGUAGES.get(language)
    if not lang:
        raise ValueError("Unsupported language")
    base = settings.judge0_url.rstrip("/")
    if base.endswith("/submissions"):
        submissions_url = base
    else:
        submissions_url = f"{base}/submissions"
    payload = {
        "language_id": lang["judge0_id"],
        "source_code": base64.b64encode(code.encode()).decode(),
        "stdin": base64.b64encode(stdin.encode()).decode(),
        "cpu_time_limit": 3,
        "cpu_extra_time": 1,
        "wall_time_limit": 7,
        "memory_limit": 128000,
        "stack_limit": 64000,
        "max_processes_and_or_threads": 60,
        "enable_network": False,
    }
    headers = _headers(settings)
    timeout = httpx.Timeout(12.0, connect=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            created = await client.post(submissions_url, params={"base64_encoded": "true", "wait": "false"}, headers=headers, json=payload)
            created.raise_for_status()
            token = created.json().get("token")
            if not token:
                raise JudgeUnavailable("Execution service did not return a job token.")
            deadline = time.monotonic() + 45
            while time.monotonic() < deadline:
                await asyncio.sleep(0.7)
                response = await client.get(f"{submissions_url}/{token}", params={"base64_encoded": "true", "fields": "*"}, headers=headers)
                response.raise_for_status()
                result = response.json()
                status = result.get("status") or {}
                status_id = status.get("id")
                if status_id not in (1, 2, 3):
                    description = status.get("description") or "Internal Error"
                    verdict = normalize_verdict(status_id, description)
                    return {
                        "verdict": verdict,
                        "status_id": status_id,
                        "stdout": _b64(result.get("stdout")),
                        "stderr": _b64(result.get("stderr")),
                        "compile_output": _b64(result.get("compile_output")),
                        "message": _b64(result.get("message")),
                        "time": result.get("time"),
                        "memory": result.get("memory"),
                    }
    except httpx.HTTPStatusError as exc:
        # Do not forward provider bodies: they may contain deployment details or credentials.
        raise JudgeUnavailable(f"Execution service returned HTTP {exc.response.status_code}.") from exc
    except httpx.HTTPError as exc:
        raise JudgeUnavailable("Could not reach the configured execution service.") from exc
    raise JudgeTimeout("Execution took too long to return. Please try again.")
