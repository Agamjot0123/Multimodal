
import fitz
import pytest

from ingestion.scripts.pdf_parser import extract_pdf


def create_test_pdf(path):
    """Create a tiny PDF for testing without needing a sample file."""
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "Hello from page one")
    document.save(path)
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