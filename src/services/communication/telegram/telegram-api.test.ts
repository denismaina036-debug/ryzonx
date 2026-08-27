import { afterEach, describe, expect, it, vi } from "vitest";
import { sendTelegramAnnouncement, sendTelegramTestMessage } from "./telegram-api";

function telegramResponse(result: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" }, ...init });
}

describe("Telegram Bot API adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends one formatted message for a normal announcement", async () => {
    const fetchMock = vi.fn().mockResolvedValue(telegramResponse({ ok: true, result: { message_id: 41 } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendTelegramAnnouncement({ token: "123:secret", chatId: "@ryvonx", heading: "Update", html: "<p>Hello</p>", appendWebsiteLink: true, websiteUrl: "https://ryvonx.com" });
    expect(result.messageIds).toEqual(["41"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({ chat_id: "@ryvonx", parse_mode: "HTML" });
  });

  it("uses sendPhoto when a public image and short caption are available", async () => {
    const fetchMock = vi.fn().mockResolvedValue(telegramResponse({ ok: true, result: { message_id: 42 } }));
    vi.stubGlobal("fetch", fetchMock);
    await sendTelegramAnnouncement({ token: "123:secret", chatId: "-1001", heading: "Image", html: '<p>Caption</p><img src="https://cdn.example.com/image.jpg">', appendWebsiteLink: false, websiteUrl: "https://ryvonx.com" });
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/sendPhoto");
  });

  it("splits a long announcement into ordered API calls", async () => {
    let id = 0;
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(telegramResponse({ ok: true, result: { message_id: ++id } })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendTelegramAnnouncement({ token: "123:secret", chatId: "@ryvonx", heading: "Long", html: `<p>${"paragraph content ".repeat(700)}</p>`, appendWebsiteLink: false, websiteUrl: "https://ryvonx.com" });
    expect(result.messageIds.length).toBeGreaterThan(1);
    expect(fetchMock).toHaveBeenCalledTimes(result.messageIds.length);
  });

  it("falls back to plain text after an explicit formatting rejection", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(telegramResponse({ ok: false, error_code: 400, description: "Bad Request: can't parse entities" }, { status: 400 }))
      .mockResolvedValueOnce(telegramResponse({ ok: true, result: { message_id: 43 } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendTelegramAnnouncement({ token: "123:secret", chatId: "@ryvonx", heading: "Fallback", html: "<p>Content</p>", appendWebsiteLink: false, websiteUrl: "https://ryvonx.com" });
    expect(result.messageIds).toEqual(["43"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).parse_mode).toBeUndefined();
  });

  it("sanitizes provider errors and never exposes the token", async () => {
    const token = "123456789:super-secret-token-value";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(telegramResponse({ ok: false, error_code: 401, description: `Unauthorized ${token}` }, { status: 401 })));
    await expect(sendTelegramTestMessage(token, "@ryvonx")).rejects.toThrow("Invalid bot token.");
    await expect(sendTelegramTestMessage(token, "@ryvonx")).rejects.not.toThrow(token);
  });
});
