-- Allow anonymous reads of published legal documents and their active versions.

CREATE POLICY legal_documents_public_read ON legal_documents
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'::legal_document_status
    AND published_version_number IS NOT NULL
  );

CREATE POLICY legal_document_versions_public_read ON legal_document_versions
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM legal_documents d
      WHERE d.id = legal_document_versions.document_id
        AND d.status = 'published'::legal_document_status
        AND d.published_version_number = legal_document_versions.version_number
    )
  );
