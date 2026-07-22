-- Clear Overall Ratings that were overwritten by empty-metric engine scores
-- matching the aggressiveness scale (1.5 / 2.5 / 4.0 / 5.0). Prefer fund-level
-- admin RyvonX rating for marketplace display until admin re-sets Overall Rating.

UPDATE pool_managers pm
SET ryvonx_rating = NULL
WHERE pm.ryvonx_rating IS NOT NULL
  AND pm.aggressiveness_rating IS NOT NULL
  AND pm.ryvonx_rating = pm.aggressiveness_rating
  AND pm.ryvonx_rating IN (1.5, 2.5, 4.0, 5.0);

-- Prefer admin marketplace pool rating onto the manager when manager rating is empty.
UPDATE pool_managers pm
SET ryvonx_rating = ranked.fund_rating
FROM (
  SELECT DISTINCT ON (f.pool_manager_id)
    f.pool_manager_id,
    f.ryvonx_rating AS fund_rating
  FROM funds f
  WHERE f.pool_manager_id IS NOT NULL
    AND f.ryvonx_rating IS NOT NULL
    AND f.ryvonx_rating NOT IN (1.5, 2.5, 4.0, 5.0)
  ORDER BY f.pool_manager_id, f.updated_at DESC NULLS LAST
) ranked
WHERE pm.id = ranked.pool_manager_id
  AND pm.ryvonx_rating IS NULL;
