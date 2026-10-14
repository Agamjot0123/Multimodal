
from pathlib import Path

from ingestion.scripts.pdf_parser import extract_pdf
from ingestion.scripts.image_parser import extract_image


SUPPORTED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}


def extract_document(file_path: str) -> dict:
    """Route a PDF or image to the appropriate extraction function."""

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    extension = path.suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            "Unsupported file format. Use PDF, PNG, JPG, or JPEG."
        )

    if extension == ".pdf":
        return extract_pdf(str(path))

    return extract_image(str(path))
