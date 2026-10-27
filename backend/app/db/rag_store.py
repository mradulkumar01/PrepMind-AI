"""ChromaDB vector store + Sentence-Transformers embeddings (lazy-loaded).

Every chunk carries user_id + resume_id metadata, and every query filters on both,
so one user can never retrieve another user's resume text.
"""
from app.core.config import get_settings


class RagStore:
    def __init__(self) -> None:
        self._collection = None

    def _col(self):
        if self._collection is None:
            import chromadb
            from chromadb.utils import embedding_functions

            s = get_settings()
            client = chromadb.PersistentClient(path=s.chroma_path)
            ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=s.embedding_model)
            self._collection = client.get_or_create_collection(
                "prepmind_docs", embedding_function=ef, metadata={"hnsw:space": "cosine"}
            )
        return self._collection

    def add_chunks(self, *, user_id: str, resume_id: str, kind: str, chunks: list[str]) -> None:
        if not chunks:
            return
        self._col().add(
            ids=[f"{resume_id}:{kind}:{i}" for i in range(len(chunks))],
            documents=chunks,
            metadatas=[
                {"user_id": user_id, "resume_id": resume_id, "kind": kind, "chunk_index": i}
                for i in range(len(chunks))
            ],
        )

    def query(self, *, user_id: str, resume_id: str, query: str, k: int = 4, kind: str | None = None) -> list[str]:
        conds = [{"user_id": user_id}, {"resume_id": resume_id}]
        if kind:
            conds.append({"kind": kind})
        res = self._col().query(query_texts=[query], n_results=k, where={"$and": conds})
        return (res.get("documents") or [[]])[0]

    def delete_resume(self, *, user_id: str, resume_id: str) -> None:
        self._col().delete(where={"$and": [{"user_id": user_id}, {"resume_id": resume_id}]})


rag_store = RagStore()
