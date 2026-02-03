-- Migration: Allow text-only posts without content_uri
-- This enables posts with just caption (no image/video)

-- Remove NOT NULL constraint from content_uri
ALTER TABLE posts ALTER COLUMN content_uri DROP NOT NULL;

-- Add a check constraint to ensure either content_uri or caption exists
ALTER TABLE posts ADD CONSTRAINT posts_content_check
  CHECK (content_uri IS NOT NULL OR caption IS NOT NULL);
