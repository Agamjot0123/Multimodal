from unittest.mock import patch
import pytest
from PIL import Image
from ingestion.scripts.image_parser import extract_image


def test_extract_image_returns_ocr_text(tmp_path):
    image_path = tmp_path / "sample.png"
    Image.new("RGB", (200, 100), "white").save(image_path)

    with patch(
        "ingestion.scripts.image_parser.extract_text_with_gemini",
        return_value="Sample OCR text",
    ) as mock_ocr:
        result = extract_image(str(image_path))

    mock_ocr.assert_called_once()

    assert result["file_name"] == "sample.png"
    assert result["total_pages"] == 1
    assert result["pages"][0]["page_number"] == 1
    assert result["pages"][0]["text"] == "Sample OCR text"
    assert result["pages"][0]["has_text"] is True


def test_missing_image_raises_error(tmp_path):
    with pytest.raises(FileNotFoundError):
        extract_image(str(tmp_path / "missing.png"))


def test_unsupported_extension_raises_error(tmp_path):
    file_path = tmp_path / "document.pdf"
    file_path.write_text("not an image", encoding="utf-8")

    with pytest.raises(ValueError, match="Unsupported image format"):
        extract_image(str(file_path))
