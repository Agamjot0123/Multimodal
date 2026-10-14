import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables from the project-root .env
load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SECRET_KEY")

if not url or not key:
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env"
    )

# Connect to Supabase
supabase = create_client(url, key)

# Test whether Storage is accessible
buckets = supabase.storage.list_buckets()
bucket_names = [bucket.name for bucket in buckets]

print("Supabase connection successful!")
print("Available buckets:", bucket_names)

for bucket in ("private-materials", "community-materials"):
    if bucket in bucket_names:
        print(f"Found bucket: {bucket}")
    else:
        print(f"WARNING: Bucket not found: {bucket}")
