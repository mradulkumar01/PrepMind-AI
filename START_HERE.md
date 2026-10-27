# Start Here

PrepMind AI is an existing React/Vite frontend and FastAPI backend. It is a Phase 1 prototype, not yet a complete production application. Follow this guide from the repository root.

## Local setup

Requirements: Python 3.11+, Node.js 18+, and Docker Desktop (or another reachable MongoDB instance).

1. Create `backend/.env` from `backend/.env.example`. Generate a unique `JWT_SECRET` with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Keep credentials out of `.env.example` and source control.
2. Start only MongoDB for local development:

   ```powershell
   docker compose up -d mongo
   ```

3. Install backend dependencies and start FastAPI:

   ```powershell
   cd backend
   py -3.11 -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

4. In another terminal, install and start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

5. Open `http://localhost:5173`; API documentation is at `http://localhost:8000/docs`.

For local UI development without an LLM, set `LLM_PROVIDER=mock`. Mock evaluations use answer length and keyword overlap; they are clearly labelled and are not AI judgements. For a real model, configure an OpenAI-compatible endpoint and model in `backend/.env`. ChromaDB's embedding model may need a first-run download.

## Run the containerized application

With Docker Compose and `backend/.env` configured, run `docker compose up --build -d` from the project root and open `http://localhost:8080`. MongoDB data and ChromaDB vectors use named volumes. For a public deployment, place this stack behind HTTPS and supply production-grade MongoDB, JWT, LLM, and speech provider settings.

## Current workflow

Registration/login → upload PDF/DOCX → skill extraction and vector indexing → configure an interview → answer text questions → receive saved feedback → review interview history and results. The current resume parser extracts text and a finite taxonomy of skills; it does not provide a structured resume-field editor. See [PROJECT_STATUS_CHECKLIST.md](PROJECT_STATUS_CHECKLIST.md) for verified and incomplete areas.

## Checks

From `backend`, run `pytest -v` after installing the requirements. From `frontend`, run `npm run build`. The build and test results recorded in the status checklist describe the last repository audit; rerun them after changes.

## Security note

Use a private, unique MongoDB credential and JWT secret. If credentials were ever committed, pasted into a shared file, or otherwise exposed, rotate them with their respective providers; deleting the text alone does not revoke them.
