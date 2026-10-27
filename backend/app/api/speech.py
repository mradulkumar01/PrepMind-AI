import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import current_user
from app.core.config import get_settings
from app.services.transcription import AudioInputError, TranscriptionUnavailable, transcribe_audio

router = APIRouter(prefix="/api/speech", tags=["speech"])


@router.get("/status")
def speech_status(user: dict = Depends(current_user)):
    configured = bool(get_settings().speech_transcription_url.strip())
    return {"available": configured, "provider": "whisper-compatible" if configured else None}


@router.post("/transcribe")
def transcribe(file: UploadFile = File(...), user: dict = Depends(current_user)):
    data = file.file.read(15 * 1024 * 1024 + 1)
    filename = os.path.basename(file.filename or "recording.webm")[:120]
    try:
        return {"text": transcribe_audio(filename, file.content_type or "", data)}
    except AudioInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except TranscriptionUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
