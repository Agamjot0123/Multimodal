
from unittest.mock import patch

import pytest

from ingestion.scripts.document_parser import extract_document


def test_pdf_is_routed_to_pdf_parser(tmp_path):
    pdf_path = tmp_path / "sample.pdf"
    pdf_path.touch()

    with patch(
        "ingestion.scripts.document_parser.extract_pdf",
        return_value={"file_name": "sample.pdf", "pages": []},
    ) as mock_pdf:
        result = extract_document(str(pdf_path))

    mock_pdf.assert_called_once_with(str(pdf_path))
    assert result["file_name"] == "sample.pdf"


def test_image_is_routed_to_image_parser(tmp_path):
    image_path = tmp_path / "sample.png"
    image_path.touch()

    with patch(
        "ingestion.scripts.document_parser.extract_image",
        return_value={"file_name": "sample.png", "pages": []},
    ) as mock_image:
        result = extract_document(str(image_path))

    mock_image.assert_called_once_with(str(image_path))
    assert result["file_name"] == "sample.png"


def test_missing_document_raises_error(tmp_path):
    with pytest.raises(FileNotFoundError):
        extract_document(str(tmp_path / "missing.pdf"))


def test_unsupported_document_format_raises_error(tmp_path):
    file_path = tmp_path / "notes.txt"
    file_path.touch()

    with pytest.raises(ValueError, match="Unsupported file format"):
        extract_document(str(file_path))
