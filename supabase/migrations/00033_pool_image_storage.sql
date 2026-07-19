-- Pool cover image storage (public read; pool managers manage files under their user folder)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pool-images',
  'pool-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read pool images" ON storage.objects;
DROP POLICY IF EXISTS "Pool managers upload own pool images" ON storage.objects;
DROP POLICY IF EXISTS "Pool managers update own pool images" ON storage.objects;
DROP POLICY IF EXISTS "Pool managers delete own pool images" ON storage.objects;

CREATE POLICY "Public read pool images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pool-images');

CREATE POLICY "Pool managers upload own pool images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pool-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Pool managers update own pool images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pool-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Pool managers delete own pool images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pool-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
