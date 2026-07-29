/** Normalize stored pool cover URLs and bust CDN/browser cache after updates. */
export function normalizeCoverImageUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    parsed.searchParams.set("v", String(Date.now()));
    return parsed.toString();
  } catch {
    const base = trimmed.split(/[?#]/)[0] ?? trimmed;
    return `${base}?v=${Date.now()}`;
  }
}

/** CSS-safe background image URL (quoted for special characters). */
export function coverImageUrlForCss(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  const escaped = trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `url("${escaped}")`;
}
