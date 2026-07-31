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

/** Supported flagcdn.com dimension values (others return 404). */
const FLAGCDN_SIZES = [20, 40, 80, 160, 320, 640, 1280, 2560] as const;

function snapFlagcdnSize(requested: number): number {
  return FLAGCDN_SIZES.find((size) => size >= requested) ?? FLAGCDN_SIZES.at(-1)!;
}

/** Cross-platform flag image URL (emoji flags are invisible on many Windows browsers). */
export function countryFlagImageUrl(code: string, height = 20): string {
  const normalized = code.trim().toLowerCase();
  if (normalized.length !== 2 || !/^[a-z]{2}$/.test(normalized)) {
    return "";
  }
  const size = snapFlagcdnSize(height);
  return `https://flagcdn.com/h${size}/${normalized}.png`;
}

export function formatCountryLabel(code: string, name: string): string {
  return `${countryCodeToFlag(code)} ${name}`;
}
