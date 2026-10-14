import argparse #argparse lets you provide a file path from PowerShell.
import json
from ingestion.scripts.document_parser import extract_document
from ingestion.scripts.text_chunker import chunk_document
from ingestion.scripts.text_chunker import chunk_transcript


def ingest_file(file_path: str) -> list[dict]:
    """
    Extract text from a PDF or image, then split it into chunks.
    """
    document = extract_document(file_path)
    chunks = chunk_document(document)
    return chunks

def ingest_transcript(transcript: dict) -> list[dict]:
    """Convert faster-whisper output into timestamped text chunks."""

    segments = [
        {
            "start": segment["start_time"],
            "end": segment["end_time"],
            "text": segment["text"],
        }
        for segment in transcript.get("segments", [])
    ]

    return chunk_transcript(
        segments=segments,
        file_name=transcript["file_name"],
    )

def main():
    parser = argparse.ArgumentParser(
        description="Extract and chunk text from a PDF or image."
    )
    parser.add_argument(
        "file_path",
        help="Path to the PDF, PNG, JPG, or JPEG file",
    )
    args = parser.parse_args()

    chunks = ingest_file(args.file_path)

    print(f"Total chunks: {len(chunks)}")
    print(json.dumps(chunks, indent=2, ensure_ascii=False))#prints the extracted chunks in a readable format.


if __name__ == "__main__":
    main()