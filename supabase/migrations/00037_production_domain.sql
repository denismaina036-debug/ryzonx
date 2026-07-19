-- RyvonX production domain — canonical https://ryvonx.com
-- Updates seeded template samples that referenced legacy app.ryvonx.com

UPDATE communication_template_versions
SET variables_schema = replace(variables_schema::text, 'https://app.ryvonx.com', 'https://ryvonx.com')::jsonb
WHERE variables_schema::text LIKE '%app.ryvonx.com%';

UPDATE communication_templates
SET variables_schema = replace(variables_schema::text, 'https://app.ryvonx.com', 'https://ryvonx.com')::jsonb
WHERE variables_schema::text LIKE '%app.ryvonx.com%';

UPDATE communication_templates
SET body_template = replace(body_template, 'https://app.ryvonx.com', 'https://ryvonx.com'),
    subject_template = replace(subject_template, 'https://app.ryvonx.com', 'https://ryvonx.com')
WHERE body_template LIKE '%app.ryvonx.com%'
   OR subject_template LIKE '%app.ryvonx.com%';

UPDATE communication_settings
SET value = replace(value::text, 'https://app.ryvonx.com', 'https://ryvonx.com')::jsonb
WHERE value::text LIKE '%app.ryvonx.com%';
