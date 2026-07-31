import { TRADE_ENTRY_DIRECTION_LABELS } from "@/constants/trade-entry";
import type { TradeEntryDirection } from "@/constants/trade-entry";

/** Display label for direction — BUY/SELL style for public journal. */
export function formatTradeDirectionLabel(direction: TradeEntryDirection): string {
  return direction === "long" ? "BUY" : "SELL";
}

export function formatTradeDirectionSubtle(direction: TradeEntryDirection): string {
  return TRADE_ENTRY_DIRECTION_LABELS[direction];
}

/** Filename or availability label — never a full URL in list views. */
export function screenshotListLabel(screenshotUrl: string | null | undefined): string {
  if (!screenshotUrl?.trim()) return "—";
  try {
    const pathname = screenshotUrl.startsWith("http")
      ? new URL(screenshotUrl).pathname
      : screenshotUrl;
    const filename = pathname.split("/").filter(Boolean).pop();
    if (filename && filename.includes(".")) return filename;
  } catch {
    /* fall through */
  }
  const segment = screenshotUrl.split("/").filter(Boolean).pop();
  if (segment && segment.includes(".")) return segment;
  return "Screenshot Available";
}

export function hasScreenshot(screenshotUrl: string | null | undefined): boolean {
  return Boolean(screenshotUrl?.trim());
}
