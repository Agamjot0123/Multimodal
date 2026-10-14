ALTER TABLE "documents"
  DROP CONSTRAINT IF EXISTS "documents_processing_status_check";

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_processing_status_check"
  CHECK ("processing_status" IN ('uploaded', 'processing', 'completed', 'failed', 'deleting', 'deleted'));

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "processing_status" TEXT NOT NULL DEFAULT 'uploaded';

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "error_message" TEXT;

ALTER TABLE "resources"
  DROP CONSTRAINT IF EXISTS "resources_processing_status_check";

ALTER TABLE "resources"
  ADD CONSTRAINT "resources_processing_status_check"
  CHECK ("processing_status" IN ('uploaded', 'processing', 'completed', 'failed', 'deleting', 'deleted'));
