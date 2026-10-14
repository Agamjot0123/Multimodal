
import os
import argparse
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

from ingestion.scripts.index_documents import index_file


def main():
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="Download a document from Supabase Storage and index it."
    )
    parser.add_argument(
        "--bucket",
        default="private-materials",
        choices=["private-materials", "community-materials"],
    )
    parser.add_argument(
        "--storage-path",
        required=True,
        help="Path to the file inside the selected bucket.",
    )
    parser.add_argument(
        "--user-id",
        required=True,
        help="Identity used by the local document index.",
    )
    parser.add_argument(
        "--document-id",
        required=True,
        help="Unique identifier for this document in the local index.",
    )
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SECRET_KEY")

    if not url or not key:
        raise RuntimeError(
            "Set SUPABASE_URL and SUPABASE_SECRET_KEY in your project-root .env"
        )

    supabase = create_client(url, key)

    local_dir = Path("ingestion/data/outputs")
    local_dir.mkdir(parents=True, exist_ok=True)

    filename = Path(args.storage_path).name
    local_file = local_dir / filename

    file_bytes = supabase.storage.from_(args.bucket).download(
        args.storage_path
    )
    local_file.write_bytes(file_bytes)

    print(f"Downloaded: {local_file}")
    print(f"Size: {len(file_bytes)} bytes")

    result = index_file(
        str(local_file),
        user_id=args.user_id,
        document_id=args.document_id,
    )

    print(f"Chunks indexed: {result}")
    print("Processing complete.")


if __name__ == "__main__":
    main()
