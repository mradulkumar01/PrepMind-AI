from app.services.skills import extract_skills


def test_finds_common_skills():
    r = extract_skills("Built REST APIs with FastAPI and React.js; used MongoDB, Docker, C++ and Python.")
    for s in ["FastAPI", "React", "MongoDB", "Docker", "C++", "Python", "REST APIs"]:
        assert s in r["skills"], s


def test_java_does_not_match_javascript():
    r = extract_skills("Experienced in JavaScript and TypeScript.")
    assert "JavaScript" in r["skills"]
    assert "Java" not in r["skills"]


def test_case_insensitive_and_categories():
    r = extract_skills("PYTORCH, tensorflow, NumPy")
    assert r["by_category"]["AI/ML"] == ["NumPy", "PyTorch", "TensorFlow"]


def test_empty_text():
    assert extract_skills("")["skills"] == []
