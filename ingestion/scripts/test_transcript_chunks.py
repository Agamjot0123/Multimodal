
import json
from pathlib import Path

from ingestion.scripts.ingestion_pipeline import ingest_transcript


def main():
    transcript_path = (
        Path(__file__).resolve().parent.parent
        / "data"
        / "transcripts"
        / "test1.json"
    )

    with transcript_path.open("r", encoding="utf-8") as file:
        transcript = json.load(file)

    chunks = ingest_transcript(transcript)

    print(f"Transcript: {transcript['file_name']}")
    print(f"Total chunks: {len(chunks)}")

    for chunk in chunks:
        print(json.dumps(chunk, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
