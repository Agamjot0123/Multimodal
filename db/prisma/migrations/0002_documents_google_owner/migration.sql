-- `documents` was created by hand in Supabase with owner_id UUID REFERENCES auth.users(id).
-- Users sign in with Google (numeric string IDs, no auth.users rows), so owner_id must be TEXT
-- like communities.owner_id / chats.user_id. This migration is idempotent: it also creates the
-- table on a fresh database and is a no-op for anything already aligned.

CREATE TABLE IF NOT EXISTS "documents" (
    "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
    "owner_id"          TEXT        NOT NULL,
    "file_name"         TEXT        NOT NULL,
    "file_type"         TEXT        NOT NULL,
    "access_scope"      TEXT        NOT NULL,
    "community_id"      UUID,
    "storage_path"      TEXT        NOT NULL,
    "processing_status" TEXT        NOT NULL,
    "error_message"     TEXT,
    "created_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "documents_access_scope_check" CHECK ("access_scope" IN ('private', 'community')),
    CONSTRAINT "documents_processing_status_check" CHECK ("processing_status" IN ('uploaded', 'processing', 'completed', 'failed')),
    CONSTRAINT "documents_check" CHECK (
        ("access_scope" = 'private' AND "community_id" IS NULL) OR
        ("access_scope" = 'community' AND "community_id" IS NOT NULL)
    ),
    CONSTRAINT "documents_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE
);

-- Drop the link to Supabase Auth users, then store the Google ID as text.
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_owner_id_fkey";

DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'owner_id') = 'uuid' THEN
    ALTER TABLE "documents" ALTER COLUMN "owner_id" TYPE TEXT USING "owner_id"::text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "documents_owner_id_idx" ON "documents"("owner_id");
CREATE INDEX IF NOT EXISTS "documents_community_id_idx" ON "documents"("community_id");

-- Backend uses the service-role key (bypasses RLS); block direct access via the anon key.
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
