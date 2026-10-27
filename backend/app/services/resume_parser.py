"""Extract text from uploaded PDF (PyMuPDF) and DOCX (python-docx) resumes, with validation."""
import io
import os
import re

MAGIC = {".pdf": b"%PDF", ".docx": b"PK"}  # DOCX is a zip archive
MAX_PDF_PAGES = 10
MIN_TEXT_CHARS = 50


class ResumeParseError(ValueError):
    """Raised for any user-correctable upload problem."""


def clean_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _pdf_text(data: bytes) -> str:
    from pypdf import PdfReader  # pure Python, so nothing for Windows to block

    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ResumeParseError("This PDF is password-protected.")
        if len(reader.pages) > MAX_PDF_PAGES:
            raise ResumeParseError(f"PDF has too many pages (max {MAX_PDF_PAGES}).")
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    except ResumeParseError:
        raise
    except Exception as exc:  # corrupt or unreadable file
        raise ResumeParseError("Could not read this PDF.") from exc

def _docx_text(data: bytes) -> str:
    import docx

    try:
        d = docx.Document(io.BytesIO(data))
    except Exception as exc:
        raise ResumeParseError("Could not read this DOCX file.") from exc
    parts = [p.text for p in d.paragraphs]
    for table in d.tables:
        for row in table.rows:
            parts.extend(cell.text for cell in row.cells)
    return "\n".join(parts)


def extract_text(filename: str, data: bytes, max_bytes: int) -> str:
    ext = os.path.splitext(filename.lower())[1]
    if ext not in MAGIC:
        raise ResumeParseError("Only .pdf and .docx files are supported.")
    if len(data) > max_bytes:
        raise ResumeParseError(f"File too large (max {max_bytes // (1024 * 1024)} MB).")
    if not data.startswith(MAGIC[ext]):
        raise ResumeParseError("File content does not match its extension.")
    text = clean_text(_pdf_text(data) if ext == ".pdf" else _docx_text(data))
    if len(text) < MIN_TEXT_CHARS:
        raise ResumeParseError("No readable text found. Scanned/image PDFs need OCR (planned, not implemented).")
    return text
