import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.api import arena, auth, interviews, learning, prep_space, resumes, speech
from app.core.config import get_settings
from app.db.mongo import ensure_indexes
from app.services.llm import LLMBadOutput, LLMUnavailable

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("prepmind")


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_indexes()
    yield


app = FastAPI(
    title="PrepMind AI",
    description="Prepare Smarter. Perform Better. Scores are practice feedback, not a measure of employability.",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth.router)
app.include_router(resumes.router)
app.include_router(interviews.router)
app.include_router(speech.router)
app.include_router(learning.router)
app.include_router(prep_space.router)
app.include_router(arena.router)


@app.get("/api/health", tags=["meta"])
def health():
    settings = get_settings()
    return {"status": "ok", "llm_provider": settings.llm_provider, "code_execution_configured": bool(settings.judge0_url.strip())}


@app.exception_handler(LLMUnavailable)
async def _llm_down(_: Request, exc: LLMUnavailable):
    status = exc.status_code
    if status in (401, 403):
        detail = "Gemini rejected the API key or access. Check LLM_API_KEY and the key's project/API access in Render."
    elif status == 404:
        detail = "Gemini could not find the configured model or endpoint. Check LLM_MODEL and LLM_BASE_URL in Render."
    elif status == 429:
        detail = "Gemini rate limit or quota reached. Check the Gemini API usage and billing limits."
    elif status is not None and 400 <= status < 500:
        detail = f"Gemini rejected the request (HTTP {status}). Check the model and request settings."
    else:
        detail = "Could not reach the AI provider. Check the Gemini endpoint and try again."
    log.warning("LLM request unavailable; provider_status=%s error=%s", status, exc)
    return JSONResponse(status_code=503, content={"detail": detail})


@app.exception_handler(LLMBadOutput)
async def _llm_bad(_: Request, exc: LLMBadOutput):
    return JSONResponse(status_code=502, content={"detail": "The AI model returned an unusable answer. Please retry."})


@app.exception_handler(PyMongoError)
async def _db_down(_: Request, exc: PyMongoError):
    log.error("MongoDB error: %s", exc)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable. Is MongoDB running?"})
