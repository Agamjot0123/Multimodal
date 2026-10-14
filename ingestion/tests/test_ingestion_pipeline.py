
from unittest.mock import patch

from ingestion.scripts.ingestion_pipeline import ingest_file


def test_ingest_file_extracts_and_chunks_document():
    mock_document = {
        "file_name": "notes.pdf",
        "total_pages": 1,
        "pages": [
            {
                "file_name": "notes.pdf",
                "page_number": 1,
                "text": "Hello from the document",
                "has_text": True,
            }
        ],
    }

    mock_chunks = [
        {
            "file_name": "notes.pdf",
            "page_number": 1,
            "chunk_index": 0,
            "text": "Hello from the document",
        }
    ]

    with patch(
        "ingestion.scripts.ingestion_pipeline.extract_document",
        return_value=mock_document,
    ) as mock_extract, patch(
        "ingestion.scripts.ingestion_pipeline.chunk_document",
        return_value=mock_chunks,
    ) as mock_chunk:
        result = ingest_file("notes.pdf")

    mock_extract.assert_called_once_with("notes.pdf")
    mock_chunk.assert_called_once_with(mock_document)
    assert result == mock_chunks
