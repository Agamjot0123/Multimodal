
import pytest

from ingestion.scripts.text_chunker import chunk_transcript


def test_transcript_chunk_preserves_timestamps():
    segments = [
        {"start": 0.0, "end": 2.5, "text": "Introduction to calculus"},
        {"start": 2.5, "end": 5.0, "text": "We will study derivatives"},
    ]

    chunks = chunk_transcript(segments, "lecture.mp4")

    assert len(chunks) == 1
    assert chunks[0]["file_name"] == "lecture.mp4"
    assert chunks[0]["page_number"] is None
    assert chunks[0]["start_time"] == 0.0
    assert chunks[0]["end_time"] == 5.0
    assert "derivatives" in chunks[0]["text"]


def test_long_transcript_is_split():
    segments = [
        {
            "start": float(i),
            "end": float(i + 1),
            "text": " ".join(["learning"] * 100),
        }
        for i in range(10)
    ]

    chunks = chunk_transcript(
        segments,
        "lecture.mp4",
        chunk_size=400,
        overlap=50,
    )

    assert len(chunks) > 1
    assert all(chunk["token_count"] <= 400 for chunk in chunks)


def test_empty_transcript_returns_no_chunks():
    assert chunk_transcript([], "lecture.mp4") == []


def test_invalid_chunk_size_raises_error():
    with pytest.raises(ValueError, match="chunk_size"):
        chunk_transcript([], "lecture.mp4", chunk_size=0)


def test_invalid_overlap_raises_error():
    with pytest.raises(ValueError, match="overlap"):
        chunk_transcript([], "lecture.mp4", chunk_size=100, overlap=100)
