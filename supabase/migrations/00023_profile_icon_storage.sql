-- Profile icon storage (public read; users manage files under their own folder)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-icons',
  'profile-icons',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read profile icons" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own profile icons" ON storage.objects;
DROP POLICY IF EXISTS "Users update own profile icons" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own profile icons" ON storage.objects;

CREATE POLICY "Public read profile icons"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-icons');

CREATE POLICY "Users upload own profile icons"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-icons'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own profile icons"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-icons'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own profile icons"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-icons'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
