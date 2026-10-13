import chromadb
from typing import List
from schemas import ContextChunk, SourceMetadata
from auth import AuthenticatedUser

# Persistent ChromaDB stored locally in backend/chroma_db
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="course_materials")

def build_permission_filter(user: AuthenticatedUser) -> dict:
    """
    Builds access control filter:
    where (owner_id == user.id) OR (community_id IN user.communities)
    """
    conditions = [{"owner_id": user.id}]

    for comm_id in user.communities:
        conditions.append({"community_id": comm_id})

    if len(conditions) > 1:
        return {"$or": conditions}
    return conditions[0]


def search_permission_scoped_chunks(
    query: str,
    user: AuthenticatedUser,
    top_k: int = 5
) -> List[ContextChunk]:
    """
    Queries ChromaDB and returns context chunks filtered by user access.
    """
    where_filter = build_permission_filter(user)

    try:
        results = collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where_filter
        )
    except Exception:
        # Returns empty list if collection is unpopulated or query fails
        return []

    retrieved_chunks = []
    if results and results.get("documents") and results["documents"][0]:
        docs = results["documents"][0]
        metadatas = results["metadatas"][0]
        ids = results["ids"][0]

        for chunk_id, doc_text, meta in zip(ids, docs, metadatas):
            retrieved_chunks.append(
                ContextChunk(
                    chunk_id=chunk_id,
                    text=doc_text,
                    metadata=SourceMetadata(
                        file_name=meta.get("file_name", "Unknown"),
                        page_number=meta.get("page_number"),
                        start_time=meta.get("start_time"),
                        end_time=meta.get("end_time")
                    )
                )
            )

    return retrieved_chunks