/**
 * Fund / Pool constants — multi-pool architecture.
 * `funds` table is the canonical Pool entity (fund_id === pool_id).
 */

export const DEFAULT_FUND_SLUG = "ryvonx-main-pool" as const;

export const DEFAULT_FUND_ID = "00000000-0000-4000-a000-000000000001" as const;

export const DEFAULT_FUND_NAME = "Ryvonx Main Pool" as const;

/** Alias — pool_id and fund_id are equivalent. */
export const DEFAULT_POOL_ID = DEFAULT_FUND_ID;
export const DEFAULT_POOL_SLUG = DEFAULT_FUND_SLUG;
export const DEFAULT_POOL_NAME = DEFAULT_FUND_NAME;

export const FUND_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  CLOSED: "closed",
  PAUSED: "paused",
  ARCHIVED: "archived",
} as const;

export const POOL_STATUS = FUND_STATUS;

export type FundStatus = (typeof FUND_STATUS)[keyof typeof FUND_STATUS];
export type PoolStatus = FundStatus;
