import {
  DEFAULT_FUND_ID,
  DEFAULT_FUND_SLUG,
} from "@/constants/funds";
import type { PoolId } from "@/domain/pools/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolve a pool id for service calls. Falls back to the default RyvonX pool
 * so existing single-pool code paths remain backward compatible.
 */
export function resolvePoolId(poolId?: string | null): PoolId {
  if (poolId && UUID_RE.test(poolId)) return poolId;
  return DEFAULT_FUND_ID;
}

export function isDefaultPool(poolId: string): boolean {
  return poolId === DEFAULT_FUND_ID;
}

export function isValidPoolId(value: string | null | undefined): value is PoolId {
  return !!value && UUID_RE.test(value);
}

/** @deprecated fund_id and pool_id are equivalent. */
export const resolveFundId = resolvePoolId;

export { DEFAULT_FUND_ID as DEFAULT_POOL_ID, DEFAULT_FUND_SLUG as DEFAULT_POOL_SLUG };
