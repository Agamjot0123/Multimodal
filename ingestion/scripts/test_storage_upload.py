
import os
from dotenv import load_dotenv
from supabase import create_client
from uuid import uuid4


load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise RuntimeError(
        "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
    )

supabase = create_client(url, key)

bucket = "private-materials"
storage_path = f"integration-tests/supabase-test-{uuid4().hex[:8]}.txt"
content = b"Supabase private storage upload test."

try:
    supabase.storage.from_(bucket).upload(
        path=storage_path,
        file=content,
        file_options={
            "content-type": "text/plain",
            "upsert": "false",
        },
    )
    print("Upload successful!")
    print(f"Bucket: {bucket}")
    print(f"Path: {storage_path}")

except Exception as exc:
    print("Upload failed.")
    print(type(exc).__name__, str(exc))
