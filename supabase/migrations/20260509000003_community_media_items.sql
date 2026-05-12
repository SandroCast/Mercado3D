-- media_items jsonb array for multi-media per message
ALTER TABLE community_messages
  ADD COLUMN IF NOT EXISTS media_items jsonb;

-- Storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "community_media_select" ON storage.objects;
DROP POLICY IF EXISTS "community_media_insert" ON storage.objects;

CREATE POLICY "community_media_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-media');

CREATE POLICY "community_media_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'community-media' AND auth.role() = 'authenticated');
