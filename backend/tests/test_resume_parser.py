import io

import pytest

from app.services.resume_parser import ResumeParseError, extract_text

MB = 1024 * 1024


def _docx_bytes(lines):
    import docx

    d = docx.Document()
    for ln in lines:
        d.add_paragraph(ln)
    buf = io.BytesIO()
    d.save(buf)
    return buf.getvalue()


def test_docx_text_extracted():
    data = _docx_bytes(["Mradul Kumar", "Skills: Python, FastAPI, React, MongoDB and Docker for web projects."])
    text = extract_text("resume.docx", data, 5 * MB)
    assert "FastAPI" in text


def test_rejects_wrong_extension():
    with pytest.raises(ResumeParseError):
        extract_text("resume.exe", b"MZ....", 5 * MB)


def test_rejects_mismatched_content():
    with pytest.raises(ResumeParseError):
        extract_text("resume.pdf", b"not a pdf at all" * 10, 5 * MB)


def test_rejects_oversize():
    with pytest.raises(ResumeParseError):
        extract_text("resume.pdf", b"%PDF" + b"0" * 100, 50)


def test_rejects_near_empty_docx():
    with pytest.raises(ResumeParseError):
        extract_text("resume.docx", _docx_bytes(["hi"]), 5 * MB)
