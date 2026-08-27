import { describe, expect, it } from "vitest";
import {
  TELEGRAM_MESSAGE_LIMIT,
  extractPublicImageUrl,
  formatTelegramAnnouncement,
  richHtmlToTelegramText,
  splitTelegramText,
} from "./telegram-content";

describe("Telegram announcement formatting", () => {
  it("converts rich HTML without leaking unsupported tags", () => {
    const result = richHtmlToTelegramText('<h2>Update</h2><p>Cycle is <strong>open</strong>.</p><ul><li>One</li><li>Two</li></ul>');
    expect(result).toContain("Update");
    expect(result).toContain("• One");
    expect(result).not.toContain("<strong>");
  });

  it("preserves link destinations", () => {
    expect(richHtmlToTelegramText('<p>Open <a href="https://ryvonx.com/pools">the pool</a>.</p>')).toContain("the pool (https://ryvonx.com/pools)");
  });

  it("appends the website once", () => {
    const appended = formatTelegramAnnouncement({ heading: "News", html: "<p>Hello</p>", appendWebsiteLink: true, websiteUrl: "https://ryvonx.com" });
    expect(appended.plainText.match(/https:\/\/ryvonx\.com/g)).toHaveLength(1);
    const existing = formatTelegramAnnouncement({ heading: "News", html: "<p>Visit https://ryvonx.com</p>", appendWebsiteLink: true, websiteUrl: "https://ryvonx.com" });
    expect(existing.plainText.match(/https:\/\/ryvonx\.com/g)).toHaveLength(1);
  });

  it("extracts only HTTPS image URLs", () => {
    expect(extractPublicImageUrl('<img src="https://cdn.example.com/a.png">')).toBe("https://cdn.example.com/a.png");
    expect(extractPublicImageUrl('<img src="http://example.com/a.png">')).toBeNull();
  });

  it("splits long announcements within Telegram limits and preserves order", () => {
    const input = Array.from({ length: 250 }, (_, index) => `Paragraph ${index}: ${"content ".repeat(8)}`).join("\n\n");
    const chunks = splitTelegramText(input);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= TELEGRAM_MESSAGE_LIMIT)).toBe(true);
    expect(chunks[0]).toContain("Paragraph 0");
    expect(chunks.at(-1)).toContain("Paragraph 249");
  });
});
