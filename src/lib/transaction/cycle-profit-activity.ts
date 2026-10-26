type CycleProfitActivityRow = {
  id: string;
  payment_method: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

function allocationId(row: CycleProfitActivityRow): string | null {
  if (row.payment_method !== "cycle_profit") return null;
  const value = row.metadata?.allocationId;
  return typeof value === "string" && value.trim() ? value : null;
}

/** Keep the earliest presentation row for each authoritative settlement allocation. */
export function dedupeCycleProfitActivities<T extends CycleProfitActivityRow>(rows: T[]): T[] {
  const canonical = new Map<string, T>();
  for (const row of rows) {
    const key = allocationId(row);
    if (!key) continue;
    const current = canonical.get(key);
    if (!current || row.created_at < current.created_at || (row.created_at === current.created_at && row.id < current.id)) {
      canonical.set(key, row);
    }
  }
  return rows.filter((row) => {
    const key = allocationId(row);
    return !key || canonical.get(key)?.id === row.id;
  });
}
