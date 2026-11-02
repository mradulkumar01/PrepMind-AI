# PrepMind AI live deployment

The project is deployed as a browser frontend and a separate API service.

| Service | URL | Purpose |
|---|---|---|
| Web application | <https://prepmind-ai-frontend.onrender.com/> | Candidate-facing PrepMind AI website |
| API health | <https://prepmind-ai-loe6.onrender.com/api/health> | Basic backend health and configured provider status |
| API documentation | <https://prepmind-ai-loe6.onrender.com/docs> | Interactive FastAPI endpoint documentation |

## Updating the deployment

The frontend and API are separate Render services. Push source changes to the connected GitHub branch, then check each service's Render events and logs for the corresponding deployment. Keep provider credentials, database credentials, and signing secrets in the relevant Render service environment variables; do not commit them to this repository.

The API health endpoint confirms that the API process responds. It does not, by itself, prove that MongoDB, a language-model provider, speech transcription, or code execution is working end to end. Verify those integrations separately in the running application.
