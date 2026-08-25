export function normalizeReferralCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^RX-[A-Z0-9]{8,64}$/.test(normalized) ? normalized : null;
}

export function referralCodeForUser(userId: string): string {
  return `RX-${userId.replace(/-/g, "").toUpperCase()}`;
}

export function buildReferralLink(code: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/register?ref=${encodeURIComponent(code)}`;
}
