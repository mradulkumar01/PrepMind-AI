# API and database schema (Phase 1)

Interactive docs: http://localhost:8000/docs. All routes except register/login/health need `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/register | name, email, password (8–64 chars) → token + user |
| POST | /api/auth/login | email, password → token + user |
| GET | /api/auth/me | current user |
| POST | /api/resumes | multipart: `file` (.pdf/.docx ≤ MAX_UPLOAD_MB), optional `job_description` |
| GET | /api/resumes | list own resumes |
| DELETE | /api/resumes/{id} | delete resume + vector chunks |
| POST | /api/interviews | `{resume_id, interview_type, target_role, topics?, difficulty?, num_questions: 3–15}` → first question |
| GET | /api/interviews | history |
| GET | /api/interviews/{id} | session with questions/answers (expected points shown only after answering) |
| POST | /api/interviews/{id}/answer | `{question_id, answer_text ≤ 4000, answer_mode: text\|transcript}` → evaluation, next question or summary |
| GET | /api/speech/status | Whether an authenticated Whisper-compatible transcription endpoint is configured |
| POST | /api/speech/transcribe | multipart audio file (≤ 15 MB) → transcript text for user review |
| GET | /api/learning-plan | Create or refresh the authenticated user's persisted roadmap from saved resume gaps and interview results |
| PATCH | /api/learning-plan/tasks/{task_id} | Update one owned roadmap task's completion state |
| GET | /api/health | liveness |

Errors: 401 unauthenticated · 404 not found/not yours · 409 conflict · 422 invalid input · 502 bad LLM output · 503 LLM/DB down.

## MongoDB collections
- **users**: `_id, name, email (unique), password_hash, created_at`
- **resumes**: `_id, user_id, filename, skills[], skills_by_category{}, jd_skills[], skill_gap[], has_jd, chunk_count, created_at`
- **interviews**: `_id, user_id, resume_id, interview_type, target_role, topics[], num_questions, status, current_difficulty, summary{}, created_at, completed_at`
- **questions**: `_id, interview_id, index, kind, topic, difficulty, text, expected_points[], is_followup, created_at`
- **answers**: `_id, interview_id, question_id (unique), text, answer_mode, scores{technical,relevance,communication,problem_solving}, overall, feedback, strengths[], improvements[], evaluator, created_at`

Speech is optional. Configure `SPEECH_TRANSCRIPTION_URL`, `SPEECH_TRANSCRIPTION_MODEL`, and, when needed, `SPEECH_API_KEY` in the backend environment. Audio is sent to that endpoint for transcription and is not persisted by PrepMind AI. The candidate reviews the transcript in the answer box before submission. Without a configured provider, the UI remains text-only.

## ChromaDB collection `prepmind_docs`
`id = {resume_id}:{kind}:{i}` · document = chunk text · metadata `{user_id, resume_id, kind: resume|jd, chunk_index}` · cosine space.
