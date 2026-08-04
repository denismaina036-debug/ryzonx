-- Update broker compatibility section copy on existing landing CMS content.

UPDATE platform_settings
SET value = jsonb_set(
  jsonb_set(
    COALESCE(value, '{}'::jsonb),
    '{copy,brokerCompatibility,title}',
    '"Trusted Brokerage Infrastructure"'::jsonb
  ),
  '{copy,brokerCompatibility,description}',
  '"RyvonX partners with verified brokers to enable secure trade execution, transparent capital management, and a seamless trading experience."'::jsonb
),
updated_at = now()
WHERE key = 'landing_content';
