/** Compact ticker for marketplace cards (e.g. XAUUSD, EURUSD, BTCUSDT). */
export function formatInstrumentTicker(
  code: string | null | undefined,
  label?: string | null
): string {
  const fromLabel = label?.trim() ? tickerFromLabel(label.trim()) : null;
  if (fromLabel) return fromLabel;

  const raw = code?.trim();
  if (!raw) return "—";

  const fromCode = tickerFromReferenceCode(raw);
  if (fromCode) return fromCode;

  return raw.replace(/_/g, " ").toUpperCase();
}

function tickerFromLabel(label: string): string | null {
  const parenPair = label.match(/\(([A-Z0-9]{2,10}\/[A-Z0-9]{2,10})\)/i);
  if (parenPair?.[1]) return parenPair[1].replace("/", "").toUpperCase();

  const slashPair = label.match(/^([A-Z0-9]{2,10}\/[A-Z0-9]{2,10})$/i);
  if (slashPair?.[1]) return slashPair[1].replace("/", "").toUpperCase();

  const compact = label.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (compact.length >= 2 && compact.length <= 10) return compact;

  return null;
}

function tickerFromReferenceCode(code: string): string | null {
  const slug = (code.includes(":") ? code.split(":").pop() : code)?.replace(/_+$/, "").toLowerCase();
  if (!slug) return null;

  if (/xau.?usd/.test(slug)) return "XAUUSD";
  if (/xag.?usd/.test(slug)) return "XAGUSD";
  if (/btc.?usdt/.test(slug)) return "BTCUSDT";
  if (/eth.?usdt/.test(slug)) return "ETHUSDT";
  if (slug.includes("nasdaq")) return "NAS100";
  if (slug.includes("spx") || slug.includes("s_p")) return "SPX500";
  if (slug.includes("us30") || slug.includes("dow")) return "US30";

  const pairMatch = slug.match(/([a-z]{3})_([a-z]{3,4})$/);
  if (pairMatch) return `${pairMatch[1]}${pairMatch[2]}`.toUpperCase();

  const tokens = slug.split("_").filter(Boolean);
  const token = tokens[0];
  if (tokens.length === 1 && token && token.length <= 10) {
    return token.toUpperCase();
  }

  return null;
}
