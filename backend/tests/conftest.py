import os

# Settings requires a secret; tests use a throwaway one.
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production-0123456789")
os.environ.setdefault("LLM_PROVIDER", "mock")
