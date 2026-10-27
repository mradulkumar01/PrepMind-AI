# PrepMind AI — *Prepare Smarter. Perform Better.*

A Multimodal Adaptive AI Mock Interview and Career Preparation System (B.Tech final-year project, IT).

New contributors: start with [START_HERE.md](START_HERE.md), then use [PROJECT_STATUS_CHECKLIST.md](PROJECT_STATUS_CHECKLIST.md) for the audited implementation status and next priorities.

> **Scores are practice feedback, not a measure of employability.** The system never infers honesty,
> personality or emotion from a face.

## Status: interview preparation plus Coding Arena in source; integration still needs local services

| Area | Status |
|---|---|
| Auth (register/login, bcrypt, JWT) | Code written |
| Resume upload (PDF/DOCX), validation, text extraction | Code written; DOCX path unit-tested, PDF path not yet run |
| Skill extraction + optional job-description skill gap | Code written, **unit-tested** |
| Chunking → embeddings → ChromaDB → semantic retrieval (RAG) | Code written, **not yet run** |
| Personalised technical / HR / project questions + follow-ups | Code written; prompt/JSON logic **unit-tested** with mock + fake LLMs; real Llama **not yet run** |
| LLM answer evaluation (4 criteria) + weighted score | Code written, logic **unit-tested** |
| Adaptive difficulty | Code written, **unit-tested** |
| History, topic-wise analytics, strengths/weaknesses | Code written, analytics **unit-tested** |
| React dashboard / interview / results pages | Code written; production build passes; browser workflow still needs verification |
| Voice interviews (Whisper-compatible endpoint) | Recording/transcription workflow implemented in source; provider integration not yet verified |
| Virtual interview room | Conference-style UI, local camera preview, browser AI voice, voice answers, adaptive questions, early submit and cancel; no remote WebRTC/video analysis |
| Webcam observable visual measurements (OpenCV + MediaPipe) | **Not implemented**; camera stays local and is not scored |
| Learning roadmap | User-specific tasks generated from saved job skill gaps and interview weaknesses; task completion is persisted |
| Downloadable PDF report | Browser print/save as PDF is available; generated PDF artifact is not implemented |
| Container deployment | Dockerfiles and Compose stack added; requires local Docker validation |
| Coding Arena | Authenticated problem library, sandbox-backed run/submit APIs, contest registration/teams/standings, AI coaching, analytics and allowlisted admin tools implemented in source; Judge0/Mongo deployment flow still needs integration verification |
| Arena rate limits | Per-user Run, Submit and AI request limits implemented; broader app-wide limits remain planned |
| CI, final docs/viva pack | **Planned — Phase 4** |

The code execution engine is deliberately disabled until a Judge0-compatible sandbox URL is configured. The API
never runs submitted code inside the PrepMind server and never fabricates successful verdicts. Arena tests cover
verdict mapping, contest timing, admin allowlisting, test-suite bounds, and idempotent scoring. See the checklist
for exactly which local integration checks passed and which need MongoDB or Docker.
No accuracy metrics are claimed anywhere in this project.

## Requirements

- Python 3.11+, Node.js 18+, Docker Desktop (for MongoDB), Git
- ~3 GB disk for `sentence-transformers` (pulls PyTorch) and a one-time embedding-model download (internet needed once)
- For real AI feedback: [Ollama](https://ollama.com) with a Llama model (≈5 GB for `llama3.1:8b`, 8 GB+ RAM; GPU optional).
  No hardware for that? Set `LLM_PROVIDER=mock` for a UI demo (clearly labelled, not real AI evaluation).
- For real code execution: a reachable Judge0-compatible isolated execution service. Use a hosted provider or
  operate Judge0 separately; keep its API key on the backend. With `JUDGE0_URL` blank, Run and Submit return a
  clear unavailable response instead of simulating execution.

## Setup (VS Code terminal)

**1. Environment**
```bash
cd backend
cp .env.example .env          # Windows: copy .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"   # paste the output as JWT_SECRET in .env
cd ..
```

**2. MongoDB (local development)**
```bash
docker compose up -d mongo
```

**3. LLM (skip if using mock mode)**
```bash
ollama pull llama3.1:8b
```

**4. Coding Arena providers (optional for browsing; required for execution and AI coaching)**

Set these values in `backend/.env` using your Judge0 provider's endpoint and server-side credentials. Add
comma-separated account emails to `ARENA_ADMIN_EMAILS` to enable problem and contest management. Never place
provider secrets in `frontend/.env` or browser code.

```dotenv
JUDGE0_URL=https://your-judge0-host.example
JUDGE0_API_KEY=your-server-side-key
JUDGE0_API_KEY_HEADER=X-RapidAPI-Key
JUDGE0_HOST=your-judge0-rapidapi-host
ARENA_ADMIN_EMAILS=admin@example.com
```

For a public deployment, configure the provider's sandbox isolation, resource limits, network policy, retention,
and rate limits as well as the API values above. Judge0 must be reachable from the backend. The app's per-run
limits are CPU 3 seconds, wall time 7 seconds, 128 MB memory, network disabled, plus an overall 75-second cap
for a full submission. Admin-created judging suites are limited to 20 cases.

**5. Backend**
```bash
cd backend
python -m venv .venv
# Windows (PowerShell):  .venv\Scripts\Activate.ps1      macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Open http://localhost:8000/docs (Swagger UI). `GET /api/health` should return `{"status":"ok",...}`.

**6. Frontend** (second terminal)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

**7. Tests**
```bash
cd backend
pytest -v
```
`test_api_smoke.py` needs the full install; the other test files only need Python + python-docx.
Press F5 in VS Code to debug the backend (`.vscode/launch.json`).

**Container deployment:** after creating `backend/.env`, run `docker compose up --build -d` from the project root and open http://localhost:8080. For public hosting, add HTTPS termination and production database/provider credentials.

## Project layout
```
backend/app/
  main.py            app, CORS, error handlers
  core/              config (.env), security (bcrypt/JWT), utils
  db/                mongo.py (PyMongo), rag_store.py (ChromaDB + embeddings)
  models/schemas.py  Pydantic request/response validation
  api/               auth.py, resumes.py, interviews.py, deps.py
  services/          skills, chunker, resume_parser, planner, llm, question_generator,
                     evaluator, scoring, adaptive, analytics, json_utils
backend/tests/       pytest tests
frontend/src/        pages (Auth, Dashboard, Interview, Results, arena), components, api.js
docs/                ARCHITECTURE.md, API_AND_SCHEMA.md, PHASE1_GUIDE.md
```

## Security & privacy (what is implemented)
- No secrets in code; app refuses to start without `JWT_SECRET`; `.env` is git-ignored
- bcrypt password hashes; JWT with expiry; every DB query is scoped to the logged-in user
- Upload validation: extension + magic bytes + size cap + page cap; raw resume text is **not** stored in MongoDB
- Resume/answer text is treated as untrusted in LLM prompts (prompt-injection mitigation — reduces, doesn't eliminate, the risk)
- Users can delete a resume; its vector chunks are deleted too
- Not yet implemented: rate limiting, HTTPS (use a reverse proxy when deploying), account deletion endpoint
