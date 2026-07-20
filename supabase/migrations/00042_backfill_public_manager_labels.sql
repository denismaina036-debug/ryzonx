-- Backfill public pool manager labels to @username (never legal display names on marketplace)

UPDATE funds f
SET pool_manager_name = '@' || COALESCE(pm.username, pm.slug)
FROM pool_managers pm
WHERE f.pool_manager_id = pm.id
  AND pm.is_platform_managed = false
  AND COALESCE(pm.username, pm.slug) IS NOT NULL;
