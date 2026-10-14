
import pymupdf
import pytest
from unittest.mock import patch

from ingestion.scripts.pdf_parser import extract_pdf


def create_test_pdf(path):
    """Create a temporary PDF for testing."""
    document = pymupdf.open()
    page = document.new_page()
    page.insert_text((72, 72), "Hello from page one")
    document.save(str(path))
    document.close()


def test_extract_pdf_preserves_page_number_and_text(tmp_path):
    pdf_path = tmp_path / "sample.pdf"
    create_test_pdf(pdf_path)

    result = extract_pdf(str(pdf_path))

    assert result["file_name"] == "sample.pdf"
    assert result["total_pages"] == 1
    assert result["pages"][0]["page_number"] == 1
    assert "Hello from page one" in result["pages"][0]["text"]
    assert result["pages"][0]["has_text"] is True


def test_missing_pdf_raises_error(tmp_path):
    missing_path = tmp_path / "missing.pdf"

    with pytest.raises(FileNotFoundError):
        extract_pdf(str(missing_path))


def test_scanned_pdf_page_uses_ocr(tmp_path):
    pdf_path = tmp_path / "scanned.pdf"

    # Create an empty page to simulate a scanned page
    # with no selectable text.
    document = pymupdf.open()
    document.new_page()
    document.save(str(pdf_path))
    document.close()

    # Mock Tesseract to test the OCR fallback.
    with patch(
        "ingestion.scripts.pdf_parser.extract_text_with_gemini",
        return_value="OCR TEST TEXT",
    ) as mock_ocr:
        result = extract_pdf(str(pdf_path))

    mock_ocr.assert_called_once()
    assert result["pages"][0]["text"] == "OCR TEST TEXT"
    assert result["pages"][0]["has_text"] is True
