import json
from pathlib import Path

import fitz  # PyMuPDF




def extract_pdf(pdf_path: str) -> dict:
    """Extract text from every PDF page and preserve source metadata."""
    path = Path(pdf_path)

    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    if path.suffix.lower() != ".pdf":
        raise ValueError("Input file must be a PDF.")

    pages = []

    with fitz.open(path) as document:
        for page_index, page in enumerate(document):
            text = page.get_text("text").strip()

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
        "C:\\grishma\\iit mandi\\3rd sem CSE\\multimodal AI track d\\multimodal-day1\\data\\sample-10-page-pdf-a4-size.pdf"
    )
    output_path = Path(
        "C:\\grishma\\iit mandi\\3rd sem CSE\\multimodal AI track d\\multimodal-day1\\output\\sample-10-page-pdf-a4-size_output.json"
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
        status = "Text found" if page["has_text"] else "No selectable text"
        print(f"Page {page['page_number']}: {status}")


if __name__ == "__main__":
    main()