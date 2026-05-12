-- Add media and link-preview support to community_messages
ALTER TABLE community_messages
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE community_messages
  ADD COLUMN IF NOT EXISTS media_url        text,
  ADD COLUMN IF NOT EXISTS media_type       text CHECK (media_type IN ('image', 'video', 'document')),
  ADD COLUMN IF NOT EXISTS media_name       text,
  ADD COLUMN IF NOT EXISTS link_url         text,
  ADD COLUMN IF NOT EXISTS link_title       text,
  ADD COLUMN IF NOT EXISTS link_description text,
  ADD COLUMN IF NOT EXISTS link_image       text;
