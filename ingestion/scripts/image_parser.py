from pathlib import Path

from ingestion.scripts.gemini_ocr import extract_text_with_gemini

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg"}

MIME_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


def extract_image(image_path: str) -> dict:
    """Extract printed or handwritten text from an image using Gemini."""
    path = Path(image_path)

    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")

    extension = path.suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            "Unsupported image format. Use PNG, JPG, or JPEG."
        )

    image_bytes = path.read_bytes()

    text = extract_text_with_gemini(
        image_bytes,
        mime_type=MIME_TYPES[extension],
    )

    return {
        "file_name": path.name,
        "total_pages": 1,
        "pages": [
            {
                "file_name": path.name,
                "page_number": 1,
                "text": text,
                "has_text": bool(text),
            }
        ],
    }