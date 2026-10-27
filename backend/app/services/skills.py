"""Rule-based skill extraction from resume / job-description text.

Deliberately simple and explainable: a curated taxonomy + word-boundary regex.
Limitation: it only finds skills that are in the taxonomy (extend TAXONOMY freely).
"""
import re

TAXONOMY: dict[str, dict[str, list[str]]] = {
    "Languages": {
        "Python": ["python"], "Java": ["java"], "JavaScript": ["javascript", "js", "ecmascript"],
        "TypeScript": ["typescript"], "C++": ["c++"], "C#": ["c#"], "Go": ["golang"],
        "Rust": ["rust"], "Kotlin": ["kotlin"], "Swift": ["swift"], "PHP": ["php"],
        "SQL": ["sql"], "Bash": ["bash", "shell scripting"], "HTML": ["html", "html5"],
        "CSS": ["css", "css3"], "MATLAB": ["matlab"],
    },
    "Frontend": {
        "React": ["react", "react.js", "reactjs"], "Angular": ["angular"], "Vue": ["vue", "vue.js"],
        "Tailwind CSS": ["tailwind", "tailwind css"], "Redux": ["redux"], "Next.js": ["next.js", "nextjs"],
        "Bootstrap": ["bootstrap"],
    },
    "Backend": {
        "FastAPI": ["fastapi"], "Flask": ["flask"], "Django": ["django"], "Node.js": ["node.js", "nodejs", "node"],
        "Express": ["express", "express.js"], "Spring Boot": ["spring boot", "springboot"],
        "REST APIs": ["rest api", "rest apis", "restful", "rest"], "GraphQL": ["graphql"],
        "WebSockets": ["websocket", "websockets"],
    },
    "Databases": {
        "MongoDB": ["mongodb", "mongo"], "MySQL": ["mysql"], "PostgreSQL": ["postgresql", "postgres"],
        "SQLite": ["sqlite"], "Redis": ["redis"], "ChromaDB": ["chromadb", "chroma"],
        "Firebase": ["firebase"],
    },
    "AI/ML": {
        "Machine Learning": ["machine learning", "ml"], "Deep Learning": ["deep learning"],
        "NLP": ["nlp", "natural language processing"], "Computer Vision": ["computer vision"],
        "TensorFlow": ["tensorflow"], "PyTorch": ["pytorch"], "scikit-learn": ["scikit-learn", "sklearn"],
        "Pandas": ["pandas"], "NumPy": ["numpy"], "OpenCV": ["opencv"], "MediaPipe": ["mediapipe"],
        "LangChain": ["langchain"], "RAG": ["rag", "retrieval augmented generation", "retrieval-augmented generation"],
        "LLMs": ["llm", "llms", "large language model", "large language models"],
        "Transformers": ["transformers", "hugging face", "huggingface"], "Whisper": ["whisper"],
        "Llama": ["llama", "llama 2", "llama 3"],
    },
    "DevOps & Tools": {
        "Git": ["git"], "GitHub": ["github"], "Docker": ["docker"], "Kubernetes": ["kubernetes", "k8s"],
        "AWS": ["aws", "amazon web services"], "Azure": ["azure"], "GCP": ["gcp", "google cloud"],
        "Linux": ["linux"], "CI/CD": ["ci/cd", "github actions", "jenkins"], "Postman": ["postman"],
        "pytest": ["pytest"],
    },
    "CS Fundamentals": {
        "Data Structures": ["data structures", "dsa"], "Algorithms": ["algorithms"],
        "OOP": ["oop", "object oriented", "object-oriented"], "DBMS": ["dbms"],
        "Operating Systems": ["operating systems", "operating system"],
        "Computer Networks": ["computer networks", "networking"],
        "System Design": ["system design"],
    },
}


def _pattern(alias: str) -> re.Pattern:
    # Not preceded/followed by letters/digits (so "java" does not match inside "javascript").
    return re.compile(r"(?<![A-Za-z0-9+#.])" + re.escape(alias) + r"(?![A-Za-z0-9+#])", re.IGNORECASE)


_COMPILED = [
    (category, canonical, [_pattern(a) for a in aliases])
    for category, skills in TAXONOMY.items()
    for canonical, aliases in skills.items()
]


def extract_skills(text: str) -> dict:
    """Return {"skills": [...sorted...], "by_category": {category: [...]}}."""
    by_category: dict[str, list[str]] = {}
    for category, canonical, patterns in _COMPILED:
        if any(p.search(text) for p in patterns):
            by_category.setdefault(category, []).append(canonical)
    for v in by_category.values():
        v.sort()
    flat = sorted({s for v in by_category.values() for s in v})
    return {"skills": flat, "by_category": by_category}
