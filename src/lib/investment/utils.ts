export function slugifyInvestmentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateInvestmentSlug(name: string): string {
  return `${slugifyInvestmentName(name)}-${Date.now().toString(36)}`;
}

export function generateAllocationReference(): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `ALC-${suffix}`;
}

export function generateTradeReference(): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `TRD-${suffix}`;
}
