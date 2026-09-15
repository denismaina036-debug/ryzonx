/** Client display vocabulary only. Never use this for routes, roles, IDs or persisted data. */
export function copyTradingText(value: string | null | undefined): string {
  if (!value) return "";
  const labels: Record<string, string> = {
    "Become a Pool Manager": "Become a verified trader",
    "Continue Pool Manager Journey": "Continue your verified trader journey",
    "Manager Journey": "Verified Trader Journey",
    "Join Pool": "Copy trader", "Create Pool": "Become a verified trader",
    "Multiplier": "Copy ratio", "Multipliers": "Copy ratios",
    "Pool Managers": "Verified traders", "Live Pools": "Copy trading", "Most Investors": "Most copiers",
    "Pool Manager": "Verified trader", "Investor": "Copier", "Managers": "Verified traders",
    "Total Investors": "Total copiers", "Active Pools": "Active strategies", "Managed by": "Trader",
  };
  if (labels[value]) return labels[value];
  return value
    .replace(/\b(?:projected ROI |ROI |projected )?multipliers\b/gi, "copy ratios")
    .replace(/\b(?:projected ROI |ROI |projected )?multiplier\b/gi, "copy ratio")
    .replace(/\binvest in (?:a |the )?pool\b/gi, "copy a trader")
    .replace(/\bjoin (?:a |the )?pool\b/gi, "copy a trader")
    .replace(/\bpool managers\b/gi, "verified traders")
    .replace(/\bpool manager\b/gi, "verified trader")
    .replace(/\bverified verified traders?\b/gi, "verified trader")
    .replace(/\bpool trading\b/gi, "copy trading")
    .replace(/\binvestment pools?\b/gi, "copy-trading strategy")
    .replace(/\binvestors\b/gi, "copiers")
    .replace(/\binvestor\b/gi, "copier")
    .replace(/\binvestments\b/gi, "copy allocations")
    .replace(/\binvestment\b/gi, "copy allocation")
    .replace(/\binvesting\b/gi, "copying")
    .replace(/\binvested\b/gi, "allocated")
    .replace(/\binvest\b/gi, "copy")
    .replace(/\bpools\b/gi, "strategies")
    .replace(/\bpool\b/gi, "strategy");
}

export function copyTraderName(pool: { managerName: string | null }): string {
  return pool.managerName?.trim() || "RyvonX Trader";
}

/** Funding commitments are not yet traded capital. Keep the existing amount unchanged. */
export function displayedTradedCapital(pool: {
  activeCycle: { status: string } | null;
  raisedCapital: number;
}): number {
  return pool.activeCycle && ["trading", "distribution", "closed", "completed"].includes(pool.activeCycle.status)
    ? pool.raisedCapital
    : 0;
}
