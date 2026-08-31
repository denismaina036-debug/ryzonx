import { describe, expect, it } from "vitest";
import { getWhatsAppSupportUrl } from "./whatsapp";

describe("getWhatsAppSupportUrl", () => {
  it.each([
    "+1 (424) 777-1920",
    "14247771920",
    "  001 424 777 1920  ",
    "https://wa.me/14247771920",
    "https://wa.me/14247771920/",
    "https://api.whatsapp.com/send?phone=%2B14247771920",
  ])("normalizes the configured support contact: %s", (contact) => {
    expect(getWhatsAppSupportUrl(contact)).toBe("https://wa.me/14247771920");
  });

  it("supports international numbers without assuming a country", () => {
    expect(getWhatsAppSupportUrl("+254 712 345 678")).toBe("https://wa.me/254712345678");
  });

  it("does not pass tracking or prefilled personal content to WhatsApp", () => {
    expect(getWhatsAppSupportUrl("https://wa.me/14247771920?text=private#tracking"))
      .toBe("https://wa.me/14247771920");
  });

  it.each([
    undefined,
    null,
    "",
    "  ",
    "not configured",
    "123",
    "0712345678",
    "+1234567890123456",
    "+1 424 777 1920 ext 5",
    "javascript:alert(1)",
    "http://wa.me/14247771920",
    "https://wa.me.evil.example/14247771920",
    "https://evil.example/14247771920",
    "https://evil.example@wa.me/14247771920",
    "https://wa.me:8443/14247771920",
    "https://wa.me/message/ABCD12345",
    "https://api.whatsapp.com/send?text=hello",
    "https://api.whatsapp.com/other?phone=14247771920",
  ])("does not render a broken or untrusted destination: %s", (contact) => {
    expect(getWhatsAppSupportUrl(contact)).toBeNull();
  });
});
