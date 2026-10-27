import pytest

from app.services.chunker import chunk_text


def test_short_text_single_chunk():
    assert chunk_text("Line one\nLine two", size=100, overlap=10) == ["Line one\nLine two"]


def test_chunks_respect_max_size_and_cover_text():
    text = "\n".join(f"Line number {i} with some words in it." for i in range(100))
    chunks = chunk_text(text, size=200, overlap=40)
    assert len(chunks) > 5
    assert all(len(c) <= 200 + 40 + 1 for c in chunks)
    assert "Line number 0 " in chunks[0] and "Line number 99 " in chunks[-1]


def test_very_long_line_without_punctuation_is_split():
    chunks = chunk_text("x" * 2500, size=800, overlap=100)
    assert len(chunks) >= 3 and all(len(c) <= 800 + 100 + 1 for c in chunks)


def test_bad_params():
    with pytest.raises(ValueError):
        chunk_text("abc", size=10, overlap=10)


def test_empty():
    assert chunk_text("  \n \n") == []
