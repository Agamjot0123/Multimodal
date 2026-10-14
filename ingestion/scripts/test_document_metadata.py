
import os
from uuid import uuid4
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise RuntimeError("Missing Supabase environment variables")

supabase = create_client(url, key)

test_id = str(uuid4())

record = {
    "owner_id": test_id,
    "file_name": "supabase-test.txt",
    "file_type": "text/plain",
    "access_scope": "private",
    "community_id": None,
    "storage_path": (
        "private-materials/"
        "integration-tests/supabase-test.txt"
    ),
    "processing_status": "uploaded",
}

try:
    result = supabase.table("documents").insert(record).execute()

    if result.data:
        print("Metadata insertion successful!")
        print("Document ID:", result.data[0]["id"])
        print("Status:", result.data[0]["processing_status"])
    else:
        print("No document record returned.")

except Exception as exc:
    print("Metadata insertion failed.")
    print(type(exc).__name__, str(exc))
