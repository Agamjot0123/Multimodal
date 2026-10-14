
from pathlib import Path

from ingestion.scripts.index_documents import (
    index_transcript_json,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def main():
    transcript_path = (
        PROJECT_ROOT
        / "ingestion"
        / "data"
        / "transcripts"
        / "test1.json"
    )

    index_transcript_json(transcript_path)


if __name__ == "__main__":
    main()
