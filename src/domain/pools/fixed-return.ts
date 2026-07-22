/** Fixed Return — independent settlement structure (amount mapping, no percentages). */

export interface FixedReturnRow {
  investmentAmount: number;
  fixedReturnAmount: number;
}

export const DEFAULT_FIXED_RETURN_ROWS: FixedReturnRow[] = [
  { investmentAmount: 100, fixedReturnAmount: 120 },
  { investmentAmount: 500, fixedReturnAmount: 620 },
  { investmentAmount: 1000, fixedReturnAmount: 1250 },
];

export function normalizeFixedReturnRows(rows: FixedReturnRow[]): FixedReturnRow[] {
  return rows
    .map((row) => ({
      investmentAmount: Number(row.investmentAmount) || 0,
      fixedReturnAmount: Number(row.fixedReturnAmount) || 0,
    }))
    .filter((row) => row.investmentAmount > 0 && row.fixedReturnAmount > row.investmentAmount)
    .sort((a, b) => a.investmentAmount - b.investmentAmount);
}

/** Exact investment amount lookup — each row maps one investment level to a total payout. */
export function resolveFixedReturnAmount(
  investmentAmount: number,
  schedule: FixedReturnRow[]
): number | null {
  if (investmentAmount <= 0 || !schedule.length) return null;
  const match = schedule.find((row) => row.investmentAmount === investmentAmount);
  return match ? match.fixedReturnAmount : null;
}

/** Profit portion of a fixed return (total payout minus principal). */
export function fixedReturnProfitAmount(
  investmentAmount: number,
  fixedReturnAmount: number
): number {
  return Math.max(0, Math.round((fixedReturnAmount - investmentAmount) * 100) / 100);
}

export function formatFixedReturnRowLabel(row: FixedReturnRow): string {
  return `Invest ${formatUsd(row.investmentAmount)} → Receive ${formatUsd(row.fixedReturnAmount)}`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function validateFixedReturnRows(rows: FixedReturnRow[]): string | null {
  const normalized = normalizeFixedReturnRows(rows);
  if (normalized.length === 0) {
    return "Add at least one Fixed Return row with Investment Amount and Investor Receives.";
  }
  const amounts = normalized.map((r) => r.investmentAmount);
  if (new Set(amounts).size !== amounts.length) {
    return "Each Investment Amount must be unique in the Fixed Return table.";
  }
  return null;
}
