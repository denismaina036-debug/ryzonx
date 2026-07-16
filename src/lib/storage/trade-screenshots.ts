export const TRADE_SCREENSHOT_BUCKET = "trade-screenshots";

export const TRADE_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

export const TRADE_SCREENSHOT_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function isAllowedScreenshotMime(type: string): boolean {
  return (TRADE_SCREENSHOT_MIME_TYPES as readonly string[]).includes(type);
}

export function extensionForMime(type: string): string {
  switch (type) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export async function uploadTradeScreenshotClient(
  file: File,
  tradeId?: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  if (tradeId) formData.append("tradeId", tradeId);

  const res = await fetch("/api/admin/trades/screenshot/upload", {
    method: "POST",
    body: formData,
  });

  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  if (!data.url) throw new Error("Upload did not return a URL");
  return data.url;
}

export async function resolveTradeScreenshotUrl(input: {
  file: File | null;
  url: string;
  tradeId?: string;
}): Promise<string | undefined> {
  if (input.file) {
    return uploadTradeScreenshotClient(input.file, input.tradeId);
  }
  const trimmed = input.url.trim();
  return trimmed || undefined;
}
