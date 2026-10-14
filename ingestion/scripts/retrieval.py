
from pathlib import Path

import math

import chromadb
from google.genai import types
from rank_bm25 import BM25Okapi

from ingestion.scripts.gemini_ocr import get_gemini_client


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = PROJECT_ROOT / "ingestion" / "data" / "chroma_db"

client = chromadb.PersistentClient(path=str(DB_PATH))

# Embeddings come from the Gemini API (no local model, so the server stays small).
# The collection name encodes the model and size: vectors of different dimensions
# cannot share a collection, so the old MiniLM collection is left untouched.
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768
EMBED_BATCH_SIZE = 100

collection = client.get_or_create_collection(
    name="course_material_scoped_gemini768",
    metadata={"hnsw:space": "cosine"},
)


def embed_texts(texts: list[str], *, is_query: bool = False) -> list[list[float]]:
    """Embed texts with Gemini, as unit-length vectors."""
    task_type = "RETRIEVAL_QUERY" if is_query else "RETRIEVAL_DOCUMENT"
    vectors = []

    for start in range(0, len(texts), EMBED_BATCH_SIZE):
        response = get_gemini_client().models.embed_content(
            model=EMBEDDING_MODEL,
            contents=texts[start:start + EMBED_BATCH_SIZE],
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=EMBEDDING_DIMENSIONS,
            ),
        )

        for embedding in response.embeddings:
            values = list(embedding.values)
            # Truncated Gemini embeddings are not normalized by default.
            norm = math.sqrt(sum(v * v for v in values)) or 1.0
            vectors.append([v / norm for v in values])

    return vectors


def add_chunks(
    chunks: list[dict],
    *,
    owner_id: str,
    document_id: str,
    access_scope: str = "private",
    community_id: str | None = None,
) -> int:
    """Store chunks with ownership and access-scope metadata."""

    if not owner_id.strip():
        raise ValueError("owner_id must not be empty")

    if not document_id.strip():
        raise ValueError("document_id must not be empty")

    if access_scope not in {"private", "community"}:
        raise ValueError("access_scope must be 'private' or 'community'")

    if access_scope == "community" and not community_id:
        raise ValueError("community_id is required for community sharing")

    if access_scope == "private" and community_id is not None:
        raise ValueError("Private documents must not have a community_id")

    if not chunks:
        return 0

    ids = []
    documents = []
    metadatas = []

    for chunk in chunks:
        text = chunk.get("text", "").strip()
        if not text:
            continue

        file_name = chunk.get("file_name", "unknown")
        chunk_index = chunk.get("chunk_index", len(ids))
        page_number = chunk.get("page_number")
        start_time = chunk.get("start_time")

        chunk_id = (
            f"{document_id}_{chunk_index}_"
            f"{page_number}_{start_time}"
        )

        # Keep only metadata types supported by ChromaDB.
        metadata = {
            key: value
            for key, value in chunk.items()
            if key != "text"
            and value is not None
            and isinstance(value, (str, int, float, bool))
        }

        # These values are enforced here, not trusted from the chunk.
        metadata.update({
            "file_name": file_name,
            "owner_id": owner_id,
            "document_id": document_id,
            "access_scope": access_scope,
        })

        if access_scope == "community":
            metadata["community_id"] = community_id

        ids.append(chunk_id)
        documents.append(text)
        metadatas.append(metadata)

    if not documents:
        return 0

    embeddings = embed_texts(documents)

    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings,
    )

    return len(documents)


def delete_document_chunks(document_id: str) -> None:
    """Remove every indexed chunk that belongs to one document."""

    if not document_id.strip():
        raise ValueError("document_id must not be empty")

    collection.delete(where={"document_id": document_id})


def get_relevant_chunks(
    query: str,
    *,
    user_id: str,
    community_ids: list[str] | None = None,
    top_k: int = 5,
) -> list[dict]:
    """Search only the user's private documents and authorized communities."""

    if not query.strip() or not user_id.strip() or top_k <= 0:
        return []

    # In the real application, the backend must verify these memberships.
    authorized_communities = list(set(community_ids or []))

    private_filter = {
        "$and": [
            {"access_scope": "private"},
            {"owner_id": user_id},
        ]
    }

    if authorized_communities:
        community_filter = {
            "$and": [
                {"access_scope": "community"},
                {"community_id": {"$in": authorized_communities}},
            ]
        }

        access_filter = {
            "$or": [private_filter, community_filter]
        }
    else:
        access_filter = private_filter

    # Both retrieval methods use the same access filter.
    # This prevents BM25 from searching unauthorized documents.
    stored = collection.get(
        where=access_filter,
        include=["documents", "metadatas"],
    )

    documents = stored["documents"] or []
    metadatas = stored["metadatas"] or []
    ids = stored["ids"]

    if not documents:
        return []

    query_embedding = embed_texts([query], is_query=True)

    vector_results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, len(documents)),
        where=access_filter,
        include=["documents", "metadatas", "distances"],
    )

    # Keyword search runs only over documents allowed by access_filter.
    tokenized_documents = [
        document.lower().split()
        for document in documents
    ]

    bm25 = BM25Okapi(tokenized_documents)
    keyword_scores = bm25.get_scores(query.lower().split())

    keyword_order = sorted(
        range(len(documents)),
        key=lambda i: keyword_scores[i],
        reverse=True,
    )[:top_k]

    # Reciprocal Rank Fusion combines vector and keyword rankings.
    fused_scores = {}

    for rank, chunk_id in enumerate(
        vector_results["ids"][0],
        start=1,
    ):
        fused_scores[chunk_id] = (
            fused_scores.get(chunk_id, 0) + 1 / (60 + rank)
        )

    id_to_index = {
        chunk_id: i
        for i, chunk_id in enumerate(ids)
    }

    for rank, index in enumerate(keyword_order, start=1):
        chunk_id = ids[index]
        fused_scores[chunk_id] = (
            fused_scores.get(chunk_id, 0) + 1 / (60 + rank)
        )

    ranked_ids = sorted(
        fused_scores,
        key=fused_scores.get,
        reverse=True,
    )[:top_k]

    results = []

    for chunk_id in ranked_ids:
        index = id_to_index[chunk_id]
        results.append({
            "text": documents[index],
            "metadata": metadatas[index] or {},
            "score": fused_scores[chunk_id],
        })

    return results
