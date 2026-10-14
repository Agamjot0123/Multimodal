
from ingestion.scripts.retrieval import add_chunks, get_relevant_chunks


def main():
    test_chunks = [
        {
            "file_name": "sustainable_development.pdf",
            "page_number": 2,
            "start_time": None,
            "end_time": None,
            "chunk_index": 0,
            "text": (
                "Resources for sustainable development are severely "
                "challenged, and many countries struggle to make ends meet."
            ),
        },
        {
            "file_name": "biology_notes.pdf",
            "page_number": 5,
            "start_time": None,
            "end_time": None,
            "chunk_index": 0,
            "text": (
                "Photosynthesis allows green plants to convert light "
                "energy into chemical energy."
            ),
        },
        {
            "file_name": "calculus_notes.pdf",
            "page_number": 10,
            "start_time": None,
            "end_time": None,
            "chunk_index": 0,
            "text": (
                "The derivative of x squared is two x, using the "
                "power rule of differentiation."
            ),
        },
        {
            "file_name": "economics_lecture.mp4",
            "page_number": None,
            "start_time": 30.0,
            "end_time": 45.0,
            "chunk_index": 1,
            "text": (
                "Economic growth can be constrained by limited resources "
                "and difficulties in meeting basic needs."
            ),
        },
    ]

    count = add_chunks(
        test_chunks,
        owner_id="hybrid_test_user",
        document_id="hybrid_test_dataset",
    )
    print(f"Chunks added or updated: {count}")

    query = "Why do countries struggle with sustainable development?"
    print(f"\nQuery: {query}")

    results = get_relevant_chunks(
        query,
        user_id="hybrid_test_user",
        top_k=3,
    )

    for rank, result in enumerate(results, start=1):
        print(f"\n--- Result {rank} ---")
        print("Text:", result["text"])
        print("Source:", result["metadata"])
        print("Fusion score:", result["score"])


if __name__ == "__main__":
    main()
