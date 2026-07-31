/** ISO 3166-1 alpha-2 code to flag emoji (e.g. US → 🇺🇸) */
export function countryCodeToFlag(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 2 || !/^[A-Z]{2}$/.test(normalized)) {
    return "🏳️";
  }
  return normalized
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

/** Cross-platform flag image URL (emoji flags are invisible on many Windows browsers). */
export function countryFlagImageUrl(code: string, height = 16): string {
  const normalized = code.trim().toLowerCase();
  if (normalized.length !== 2 || !/^[a-z]{2}$/.test(normalized)) {
    return "";
  }
  return `https://flagcdn.com/h${height}/${normalized}.png`;
}

export function formatCountryLabel(code: string, name: string): string {
  return `${countryCodeToFlag(code)} ${name}`;
}
