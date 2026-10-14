
import json
from pathlib import Path

from ingestion.scripts.retrieval import (
    add_chunks,
    get_relevant_chunks,
)
from ingestion.scripts.text_chunker import chunk_transcript


def main():
    transcript_path = (
        Path(__file__).resolve().parents[1]
        / "data"
        / "transcripts"
        / "test1.json"
    )

    with transcript_path.open("r", encoding="utf-8") as file:
        transcript = json.load(file)

    segments = [
        {
            "start": segment["start_time"],
            "end": segment["end_time"],
            "text": segment["text"],
        }
        for segment in transcript["segments"]
    ]

    chunks = chunk_transcript(
        segments=segments,
        file_name=transcript["file_name"],
    )

    stored_count = add_chunks(
        chunks,
        owner_id="local_test_user",
        document_id="transcript_test_001",
    )
    print(f"Chunks stored: {stored_count}")

    query = "What challenges do countries face in sustainable development?"
    results = get_relevant_chunks(
        query,
        user_id="local_test_user",
        top_k=3,
    )

    print("\nSearch results:")
    for result in results:
        print("\nText:", result["text"])
        print("Source:", result["metadata"])
        print("Fusion score:", result["score"])


if __name__ == "__main__":
    main()
