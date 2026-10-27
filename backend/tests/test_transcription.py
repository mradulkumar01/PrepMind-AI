import pytest
from types import SimpleNamespace

from app.services import transcription
from app.services.transcription import AudioInputError, TranscriptionUnavailable, transcribe_audio


def test_transcription_is_optional_when_provider_is_not_configured(monkeypatch):
    monkeypatch.setattr(transcription, "get_settings", lambda: SimpleNamespace(speech_transcription_url=""))
    with pytest.raises(TranscriptionUnavailable, match="not configured"):
        transcribe_audio("answer.webm", "audio/webm", b"not-a-recording")


def test_transcription_rejects_invalid_audio_signature(monkeypatch):
    settings = SimpleNamespace(speech_transcription_url="http://127.0.0.1:9/v1/audio/transcriptions")
    monkeypatch.setattr(transcription, "get_settings", lambda: settings)
    with pytest.raises(AudioInputError, match="valid WebM"):
        transcribe_audio("answer.webm", "audio/webm", b"invalid")
