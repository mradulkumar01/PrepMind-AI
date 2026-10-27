# Project status checklist

Audit snapshot: 22 October 2026. Status reflects source inspection plus the checks listed below; a file existing does not establish that its integration works.

## Implemented in source

- [x] FastAPI routes for registration, login, current user, resume upload/list/delete, interview creation/history/detail, and answer submission.
- [x] Bcrypt password hashing, JWT bearer authentication, and user ownership filters on resume/interview operations.
- [x] PDF/DOCX extraction with extension, magic-byte, upload-size, page-count, encrypted-PDF, and minimum-readable-text checks.
- [x] Curated skill extraction, overlapping chunking, ChromaDB persistence, Sentence-Transformers embedding configuration, and user/resume metadata filters.
- [x] Configurable OpenAI-compatible LLM and deterministic mock provider, with labelled mock evaluator output.
- [x] Structured question/evaluation JSON parsing, one retry, weighted text-only scoring, adaptive difficulty, and saved interview summaries.
- [x] React authentication, resume upload, interview setup/answering, history, and results views; Vite proxies `/api` to port 8000.
- [x] Light pink theme with matching pink outlines, glass-like cards, responsive layouts, and restrained motion.
- [x] Interview setup accepts a target role, optional topics, question count, interview type, and starting difficulty; these values are passed to the backend and used in retrieval/planning.
- [x] Interview room has optional camera preview (local only; no video upload or visual scoring), browser spoken questions, and voice answers via browser speech recognition or the configured Whisper-compatible transcription endpoint.
- [x] Conference-style interview controls can submit a partial interview (including a typed final answer) or cancel it while preserving saved-answer history.
- [x] A persisted learning roadmap is generated from detected resume/JD skill gaps and saved interview weaknesses; users can mark their own tasks complete.
- [x] Evaluations retain and display a sample answer structure. Mock mode uses a generic framework and does not claim candidate experience.
- [x] Dockerfiles, Nginx SPA/API proxy configuration, MongoDB health check, and persistent Mongo/Chroma volumes are defined for a local container deployment.
- [x] Frontend production build completed during this audit.
- [x] Coding Arena dark-first module and authenticated navigation, problem filtering/bookmarks, autosaving workspace, sample runs, hidden-suite submissions, history, progress analytics, and achievements.
- [x] Judge0-compatible execution adapter keeps submitted code outside the API process, applies resource/network limits, and reports real provider verdicts; the feature fails closed when no provider is configured.
- [x] Contest registration, team invite codes, server-time windows, accepted-solve scoring with atomic idempotency, and periodically refreshed standings.
- [x] Backend-enforced AI contest restrictions, real-provider-only coding assistant, admin allowlist, curated starter library, and bounded admin test suites.
- [x] Arena test coverage added for Judge0 verdict normalization, contest time boundaries, score idempotency, admin permissions, and test-suite limits.

## Incomplete or unverified

- [x] Backend unit/service tests: 50 passed under the project's Python 3.14 virtual environment; the Mongo-dependent API smoke tests did not complete without MongoDB.
- [ ] Real MongoDB persistence and ChromaDB retrieval: not integration-tested in this audit. Existing tests cover isolated service logic, but that does not verify service startup or cross-store behavior.
- [ ] Real LLM provider: not verified. Mock mode is implemented and deliberately distinct from the real provider.
- [ ] Resume field extraction/review: text and skills are extracted, but education/projects/experience are not structured for user correction.
- [ ] Dashboard, interview and result screens have no automated frontend/API integration test suite.
- [ ] Roadmap recommendation quality and task persistence need database integration testing. PDF export is browser print, not a generated report artifact.
- [ ] Speech endpoint/provider integration is not verified. Set `SPEECH_TRANSCRIPTION_URL` (and credentials/model if needed) to use it; text-only mode remains available.
- [ ] Webcam analysis/measurements, profile/settings, account deletion, and app-wide rate limiting are not implemented. Arena endpoints have per-user action limits; the camera feature is only a local preview.
- [ ] Remote/WebRTC video conferencing is not implemented; the virtual room presents the local camera preview and AI interviewer avatar/voice in the browser.
- [ ] Logout removes the browser token; there is no server-side token revocation/session endpoint. JWT is stored in localStorage.
- [ ] Interview answer persistence and follow-up/question generation are separate operations without a transaction; the interview screen can recover/retry a next-question generation after an answer is saved.
- [ ] Production deployment hardening, CI, and privacy/data deletion lifecycle for a complete account are not implemented.
- [ ] Docker Compose configuration could not be validated or launched in this environment because Docker is not installed. Public hosting still needs HTTPS, production secrets, external model endpoints, and operational monitoring.
- [ ] Judge0 is an external dependency and was not configured here; actual Java/Python/C/C++/JavaScript/SQLite compile/run/judge workflows need a reachable sandbox and credentials.
- [ ] Arena does not bundle Monaco; its accessible editor provides line numbers, indentation, autosave, keyboard run, theme and font controls, but not syntax highlighting or code folding.
- [ ] Company tags, certificate generation, contest notifications, detailed contest-rank history, and admin registration/team moderation are not implemented. Editorial text is not sent to public problem responses until a release policy exists.
- [ ] The production build passed. The 50-test backend unit/service suite passed with Python 3.14. The API smoke tests stalled at the health request in this environment; the cause was not isolated, so app startup and Mongo integration remain unverified.

## Checks run for this audit

- `npm run build` in `frontend`: passed after adding the arena pages.
- `python -m compileall -q app` in `backend`: passed (syntax compilation only; does not validate database/provider integration).
- `python -m pytest -q --ignore=tests/test_api_smoke.py` in `backend`: 50 passed.
- `python -m pytest -q tests/test_api_smoke.py`: stalled at the first health request; interrupted. No API/Mongo integration pass is claimed.

## Priority order

1. Rotate any credentials previously exposed in a shared or tracked file; use generated local secrets and placeholders in examples.
2. Start Docker/MongoDB and resolve/verify the current API lifespan startup; rerun the smoke tests.
3. Verify MongoDB indexes, ChromaDB indexing/retrieval and ownership isolation with automated tests.
4. Make interview answer/question transitions recoverable when the LLM or vector store is unavailable.
5. Complete resume review, structured evaluation details, and actionable roadmap from persisted data.
6. Configure a Judge0 sandbox and real LLM endpoint, then exercise full coding and contest workflows end to end.
7. Add frontend workflow coverage, admin moderation, released editorials and accessibility/loading/error checks.
8. Implement or explicitly defer speech, optional visual measurements, and production deployment hardening.
