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

export function formatCountryLabel(code: string, name: string): string {
  return `${countryCodeToFlag(code)} ${name}`;
}
