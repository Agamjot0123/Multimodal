from pathlib import Path
import json

from ingestion.scripts.pdf_parser import extract_pdf

pdf_path = Path("ingestion/data/samples/sample_scanned.pdf")

result = extract_pdf(str(pdf_path))

print("Filename:", result["file_name"])
print("Total pages:", result["total_pages"])

for page in result["pages"]:
    print(f"\nPage {page['page_number']}")
    print("Text found:", page["has_text"])
    print("Extracted text:")
    print(page["text"][:500])

output_path = Path("ingestion/data/outputs/pdf_test_result.json")
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(
    json.dumps(result, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(f"\nSaved result to: {output_path}")
