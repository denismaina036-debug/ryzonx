-- Trade entry screenshots visible to investors on marketplace / cycle views.

ALTER TABLE trade_entries
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS investor_visible BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN trade_entries.screenshot_url IS 'Public chart screenshot URL (trade-screenshots bucket).';
COMMENT ON COLUMN trade_entries.investor_visible IS 'When true, closed trades may appear in investor-facing journal feeds.';

-- Pool managers may upload screenshots for their own trade entries.
DROP POLICY IF EXISTS "Pool managers upload trade screenshots" ON storage.objects;
CREATE POLICY "Pool managers upload trade screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trade-screenshots'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM pool_managers pm
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Pool managers update trade screenshots" ON storage.objects;
CREATE POLICY "Pool managers update trade screenshots"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'trade-screenshots'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM pool_managers pm
      WHERE pm.user_id = auth.uid()
    )
  );
