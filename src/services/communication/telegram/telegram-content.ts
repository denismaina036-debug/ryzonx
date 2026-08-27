import { sanitizeLegalHtml } from "@/lib/legal/sanitize-html";

export const TELEGRAM_MESSAGE_LIMIT = 4096;
export const TELEGRAM_CAPTION_LIMIT = 1024;

export type TelegramContent = {
  formattedText: string;
  plainText: string;
  imageUrl: string | null;
};

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}
export function escapeTelegramHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function extractPublicImageUrl(html: string): string | null {
  const match = sanitizeLegalHtml(html).match(/<img\b[^>]*\bsrc=["'](https:\/\/[^"']+)["'][^>]*>/i);
  return match?.[1] ?? null;
}

export function richHtmlToTelegramText(html: string): string {
  let clean = sanitizeLegalHtml(html);
  clean = clean.replace(/<img\b[^>]*>/gi, "");
  clean = clean.replace(
    /<a\b[^>]*\bhref=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, url: string, label: string) => `${label.replace(/<[^>]+>/g, "")} (${url})`
  );
  clean = clean
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/h[1-6]>|<\/blockquote>|<\/tr>/gi, "\n\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/?(?:ul|ol|table|thead|tbody)\b[^>]*>/gi, "")
    .replace(/<\/?(?:td|th)\b[^>]*>/gi, "  ")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(clean)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatTelegramAnnouncement(input: {
  heading: string;
  html: string;
  appendWebsiteLink: boolean;
  websiteUrl: string;
}): TelegramContent {
  const heading = input.heading.trim();
  const body = richHtmlToTelegramText(input.html);
  const normalizedWebsite = input.websiteUrl.replace(/\/$/, "");
  const shouldAppend =
    input.appendWebsiteLink &&
    normalizedWebsite.length > 0 &&
    !`${heading}\n${body}`.toLowerCase().includes(normalizedWebsite.toLowerCase());
  const suffix = shouldAppend ? `\n\n🌐 ${normalizedWebsite}` : "";
  const plainText = `📢 ${heading}\n\n${body}${suffix}`.trim();
  const formattedText = `<b>📢 ${escapeTelegramHtml(heading)}</b>\n\n${escapeTelegramHtml(body)}${
    shouldAppend ? `\n\n🌐 ${escapeTelegramHtml(normalizedWebsite)}` : ""
  }`.trim();
  return { formattedText, plainText, imageUrl: extractPublicImageUrl(input.html) };
}

function bestBoundary(value: string, maxLength: number): number {
  const slice = value.slice(0, maxLength + 1);
  const paragraph = slice.lastIndexOf("\n\n");
  if (paragraph >= Math.floor(maxLength * 0.55)) return paragraph;
  const newline = slice.lastIndexOf("\n");
  if (newline >= Math.floor(maxLength * 0.65)) return newline;
  const space = slice.lastIndexOf(" ");
  return space >= Math.floor(maxLength * 0.75) ? space : maxLength;
}

export function splitTelegramText(value: string, maxLength = TELEGRAM_MESSAGE_LIMIT): string[] {
  const text = value.trim();
  if (text.length <= maxLength) return [text];
  const markerReserve = 18;
  const contentLimit = maxLength - markerReserve;
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > contentLimit) {
    const at = bestBoundary(remaining, contentLimit);
    chunks.push(remaining.slice(0, at).trim());
    remaining = remaining.slice(at).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks.map((chunk, index) => `Announcement ${index + 1}/${chunks.length}\n\n${chunk}`);
}
