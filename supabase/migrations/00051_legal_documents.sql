-- =============================================================================
-- RyvonX Legal Documents — Terms of Service & Privacy Policy CMS
-- =============================================================================

CREATE TYPE legal_document_type AS ENUM ('terms_of_service', 'privacy_policy');
CREATE TYPE legal_document_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type legal_document_type NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  page_title TEXT NOT NULL,
  meta_description TEXT NOT NULL DEFAULT '',
  meta_keywords TEXT NOT NULL DEFAULT '',
  og_image_url TEXT NOT NULL DEFAULT '',
  status legal_document_status NOT NULL DEFAULT 'draft',
  published_version_number INTEGER,
  draft_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE legal_document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  slug TEXT NOT NULL,
  page_title TEXT NOT NULL,
  meta_description TEXT NOT NULL DEFAULT '',
  meta_keywords TEXT NOT NULL DEFAULT '',
  og_image_url TEXT NOT NULL DEFAULT '',
  sections JSONB NOT NULL,
  change_notes TEXT,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);

CREATE TABLE legal_document_acceptances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES legal_document_versions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_id, version_id)
);

CREATE INDEX idx_legal_documents_status ON legal_documents (status);
CREATE INDEX idx_legal_document_versions_document ON legal_document_versions (document_id, version_number DESC);
CREATE INDEX idx_legal_document_acceptances_user ON legal_document_acceptances (user_id, document_id);

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY legal_documents_admin_all ON legal_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
  );

CREATE POLICY legal_document_versions_admin_all ON legal_document_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
  );

CREATE POLICY legal_document_acceptances_select_own ON legal_document_acceptances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY legal_document_acceptances_insert_own ON legal_document_acceptances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY legal_document_acceptances_admin_all ON legal_document_acceptances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
  );

COMMENT ON TABLE legal_documents IS 'Editable legal documents (Terms of Service, Privacy Policy) with draft/publish workflow';
COMMENT ON TABLE legal_document_versions IS 'Immutable published version history for legal documents';
COMMENT ON TABLE legal_document_acceptances IS 'Permanent record of user acceptance of legal document versions';

CREATE OR REPLACE FUNCTION _legal_seed_sections(prefix TEXT, titles TEXT[])
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', prefix || '-' || ordinality::text,
        'title', title,
        'sortOrder', ordinality - 1,
        'content', '<p>This section outlines ' || lower(title) || ' for the RyvonX platform. Administrators can edit this content at any time.</p>'
      )
      ORDER BY ordinality
    ),
    '[]'::jsonb
  )
  FROM unnest(titles) WITH ORDINALITY AS t(title, ordinality);
$$;

DO $$
DECLARE
  terms_sections JSONB;
  privacy_sections JSONB;
  terms_doc_id UUID;
  privacy_doc_id UUID;
BEGIN
  terms_sections := _legal_seed_sections('terms', ARRAY[
    'Introduction', 'Definitions', 'Eligibility', 'User Accounts',
    'Identity Verification (KYC)', 'Platform Services', 'Investor Responsibilities',
    'Pool Manager Responsibilities', 'Investment Risks', 'Wallets, Deposits & Withdrawals',
    'Fees', 'Investment Cycles & Settlements', 'Prohibited Activities',
    'Account Suspension & Termination', 'Intellectual Property', 'Limitation of Liability',
    'Indemnification', 'Changes to these Terms', 'Governing Law', 'Contact Information'
  ]);

  privacy_sections := _legal_seed_sections('privacy', ARRAY[
    'Introduction', 'Information We Collect', 'How We Use Information', 'Cookies',
    'Information Sharing', 'Data Security', 'Data Retention', 'User Rights',
    'Marketing Communications', 'International Data Transfers', 'Children''s Privacy',
    'Policy Updates', 'Contact Information'
  ]);

  INSERT INTO legal_documents (
    document_type, slug, page_title, meta_description, meta_keywords,
    status, published_version_number, draft_sections
  ) VALUES (
    'terms_of_service',
    'terms',
    'Terms of Service | RyvonX',
    'Read the RyvonX Terms of Service governing investor accounts, pool participation, wallets, and platform use.',
    'RyvonX, terms of service, legal, investor agreement',
    'published',
    1,
    terms_sections
  )
  RETURNING id INTO terms_doc_id;

  INSERT INTO legal_document_versions (
    document_id, version_number, slug, page_title, meta_description, meta_keywords,
    sections, change_notes, published_at
  ) VALUES (
    terms_doc_id,
    1,
    'terms',
    'Terms of Service | RyvonX',
    'Read the RyvonX Terms of Service governing investor accounts, pool participation, wallets, and platform use.',
    'RyvonX, terms of service, legal, investor agreement',
    terms_sections,
    'Initial published version',
    now()
  );

  INSERT INTO legal_documents (
    document_type, slug, page_title, meta_description, meta_keywords,
    status, published_version_number, draft_sections
  ) VALUES (
    'privacy_policy',
    'privacy',
    'Privacy Policy | RyvonX',
    'Learn how RyvonX collects, uses, and protects your personal information and platform data.',
    'RyvonX, privacy policy, data protection, personal information',
    'published',
    1,
    privacy_sections
  )
  RETURNING id INTO privacy_doc_id;

  INSERT INTO legal_document_versions (
    document_id, version_number, slug, page_title, meta_description, meta_keywords,
    sections, change_notes, published_at
  ) VALUES (
    privacy_doc_id,
    1,
    'privacy',
    'Privacy Policy | RyvonX',
    'Learn how RyvonX collects, uses, and protects your personal information and platform data.',
    'RyvonX, privacy policy, data protection, personal information',
    privacy_sections,
    'Initial published version',
    now()
  );
END $$;

DROP FUNCTION IF EXISTS _legal_seed_sections(TEXT, TEXT[]);
