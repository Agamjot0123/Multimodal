
import tiktoken
import pytest

from ingestion.scripts.text_chunker import chunk_document


def make_document(text):
    return {
        "file_name": "notes.pdf",
        "total_pages": 1,
        "pages": [
            {
                "file_name": "notes.pdf",
                "page_number": 1,
                "text": text,
                "has_text": bool(text),
            }
        ],
    }


def test_short_text_produces_one_chunk():
    document = make_document("Hello from my notes")

    chunks = chunk_document(document)

    assert len(chunks) == 1
    assert chunks[0]["text"] == "Hello from my notes"
    assert chunks[0]["token_count"] > 0


def test_long_text_is_split_into_chunks():
    tokenizer = tiktoken.get_encoding("cl100k_base")
    text = " ".join(["hello"] * 1000)
    document = make_document(text)

    chunks = chunk_document(document, chunk_size=400, overlap=50)

    assert len(chunks) > 1
    assert all(chunk["token_count"] <= 400 for chunk in chunks)


def test_chunk_metadata_is_preserved():
    document = make_document("These are some study notes")

    chunks = chunk_document(document)

    chunk = chunks[0]
    assert chunk["file_name"] == "notes.pdf"
    assert chunk["page_number"] == 1
    assert chunk["start_time"] is None
    assert chunk["end_time"] is None
    assert chunk["chunk_index"] == 0


def test_empty_pages_are_skipped():
    document = make_document("")

    assert chunk_document(document) == []


def test_invalid_chunk_size_raises_error():
    document = make_document("Some text")

    with pytest.raises(ValueError, match="chunk_size"):
        chunk_document(document, chunk_size=0)


def test_invalid_overlap_raises_error():
    document = make_document("Some text")

    with pytest.raises(ValueError, match="overlap"):
        chunk_document(document, chunk_size=100, overlap=100)
