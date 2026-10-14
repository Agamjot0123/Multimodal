import json
from pathlib import Path

import pymupdf

from ingestion.scripts.gemini_ocr import extract_text_with_gemini


def extract_pdf(pdf_path: str) -> dict:
    """Extract native PDF text first, using Gemini for scanned pages."""
    path = Path(pdf_path)

    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    if path.suffix.lower() != ".pdf":
        raise ValueError("Input file must be a PDF.")

    pages = []

    with pymupdf.open(path) as document:
        for page_index, page in enumerate(document):
            # Prefer native text extraction when usable text exists.
            text = page.get_text("text").strip()

            # Use Gemini OCR when no selectable text is present.
            if not text:
                pixmap = page.get_pixmap(dpi=300, alpha=False)
                image_bytes = pixmap.tobytes("png")

                text = extract_text_with_gemini(
                    image_bytes,
                    mime_type="image/png",
                )

            pages.append({
                "file_name": path.name,
                "page_number": page_index + 1,
                "text": text,
                "has_text": bool(text),
            })

    return {
        "file_name": path.name,
        "total_pages": len(pages),
        "pages": pages,
    }


def main():
    pdf_path = Path(
        "ingestion/data/samples/sample-10-page-pdf-a4-size.pdf"
    )

    output_path = Path(
        "ingestion/data/outputs/sample-10-page-pdf-a4-size_output.json"
    )

    result = extract_pdf(str(pdf_path))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(result, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"PDF: {result['file_name']}")
    print(f"Pages processed: {result['total_pages']}")
    print(f"Output saved to: {output_path}")

    for page in result["pages"]:
        status = "Text found" if page["has_text"] else "No text found"
        print(f"Page {page['page_number']}: {status}")


if __name__ == "__main__":
    main()