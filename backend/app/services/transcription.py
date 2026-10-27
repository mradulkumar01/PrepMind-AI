"""Optional Whisper-compatible transcription with bounded uploads and timeouts."""
import httpx

from app.core.config import get_settings

MAX_AUDIO_BYTES = 15 * 1024 * 1024
SUPPORTED_AUDIO = {".webm", ".wav", ".mp3", ".m4a", ".mp4", ".ogg", ".mpeg", ".mpga"}


class AudioInputError(ValueError):
    pass


class TranscriptionUnavailable(RuntimeError):
    pass


def _has_valid_signature(extension: str, data: bytes) -> bool:
    if extension == ".webm":
        return data.startswith(bytes.fromhex("1A45DFA3"))
    if extension == ".wav":
        return data.startswith(b"RIFF") and data[8:12] == b"WAVE"
    if extension == ".ogg":
        return data.startswith(b"OggS")
    if extension in {".m4a", ".mp4"}:
        return len(data) >= 12 and data[4:8] == b"ftyp"
    if extension in {".mp3", ".mpeg", ".mpga"}:
        return data.startswith(b"ID3") or (len(data) >= 2 and data[0] == 0xFF and data[1] & 0xE0 == 0xE0)
    return False


def transcribe_audio(filename: str, content_type: str, data: bytes) -> str:
    settings = get_settings()
    if not settings.speech_transcription_url.strip():
        raise TranscriptionUnavailable("Speech transcription is not configured")
    if not data:
        raise AudioInputError("Recording is empty")
    if len(data) > MAX_AUDIO_BYTES:
        raise AudioInputError("Recording exceeds the 15 MB limit")

    extension = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in SUPPORTED_AUDIO or not _has_valid_signature(extension, data):
        raise AudioInputError("Use a valid WebM, WAV, MP3, M4A, MP4, or OGG recording")
    if not content_type.lower().startswith(("audio/", "video/mp4", "application/ogg")):
        raise AudioInputError("Unsupported audio content type")

    headers = {"Authorization": f"Bearer {settings.speech_api_key}"} if settings.speech_api_key else {}
    try:
        response = httpx.post(
            settings.speech_transcription_url,
            headers=headers,
            data={"model": settings.speech_transcription_model},
            files={"file": (filename, data, content_type.split(";", 1)[0])},
            timeout=httpx.Timeout(90.0, connect=5.0),
        )
        response.raise_for_status()
        transcript = response.json().get("text")
    except (httpx.HTTPError, ValueError, AttributeError) as exc:
        raise TranscriptionUnavailable("Transcription provider request failed") from exc

    if not isinstance(transcript, str) or not transcript.strip():
        raise TranscriptionUnavailable("Transcription provider returned no transcript")
    return transcript.strip()[:4000]
