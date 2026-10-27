"""Split text into overlapping chunks for embedding.

Chunks are at most `size + overlap + 1` characters (the +1 is the newline joining the overlap tail). Resume text is line-oriented, so lines are the base unit.
"""
import re


def _split_long(unit: str, size: int) -> list[str]:
    if len(unit) <= size:
        return [unit]
    pieces, cur = [], ""
    for sentence in re.split(r"(?<=[.!?])\s+", unit):
        while len(sentence) > size:  # no punctuation at all -> hard slice
            if cur:
                pieces.append(cur)
                cur = ""
            pieces.append(sentence[:size])
            sentence = sentence[size:]
        if cur and len(cur) + 1 + len(sentence) > size:
            pieces.append(cur)
            cur = sentence
        else:
            cur = f"{cur} {sentence}".strip()
    if cur:
        pieces.append(cur)
    return pieces


def chunk_text(text: str, size: int = 800, overlap: int = 120) -> list[str]:
    if size <= 0 or overlap < 0 or overlap >= size:
        raise ValueError("Need size > 0 and 0 <= overlap < size")
    units = [ln.strip() for ln in text.splitlines() if ln.strip()]
    chunks: list[str] = []
    cur = ""
    for unit in units:
        for piece in _split_long(unit, size):
            if cur and len(cur) + 1 + len(piece) > size:
                chunks.append(cur)
                tail = cur[-overlap:] if overlap else ""
                cur = f"{tail}\n{piece}".strip()
            else:
                cur = f"{cur}\n{piece}" if cur else piece
    if cur:
        chunks.append(cur)
    return chunks
