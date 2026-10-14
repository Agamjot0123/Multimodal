
from ingestion.scripts.ingestion_pipeline import ingest_transcript


def test_ingest_transcript_preserves_timestamps_and_filename():
    transcript = {
        "file_name": "lecture.mp4",
        "language": "en",
        "segments": [
            {
                "start_time": 0.0,
                "end_time": 3.5,
                "text": "Introduction to machine learning",
            },
            {
                "start_time": 3.5,
                "end_time": 7.0,
                "text": "We will study supervised learning",
            },
        ],
    }

    chunks = ingest_transcript(transcript)

    assert len(chunks) == 1
    assert chunks[0]["file_name"] == "lecture.mp4"
    assert chunks[0]["start_time"] == 0.0
    assert chunks[0]["end_time"] == 7.0
    assert "supervised learning" in chunks[0]["text"]
