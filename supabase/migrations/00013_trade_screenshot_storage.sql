-- Trade screenshot storage bucket (public read for investor trade cards)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trade-screenshots',
  'trade-screenshots',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins update trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete trade screenshots" ON storage.objects;

CREATE POLICY "Public read trade screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trade-screenshots');

CREATE POLICY "Admins upload trade screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trade-screenshots'
    AND get_user_role() = 'administrator'
  );

CREATE POLICY "Admins update trade screenshots"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'trade-screenshots'
    AND get_user_role() = 'administrator'
  );

CREATE POLICY "Admins delete trade screenshots"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'trade-screenshots'
    AND get_user_role() = 'administrator'
  );
