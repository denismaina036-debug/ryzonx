/** Build a click-to-chat link from the existing admin-managed support contact. */
export function getWhatsAppSupportUrl(contact: string | null | undefined): string | null {
  let phone = contact?.trim();
  if (!phone) return null;

  if (phone.startsWith("https://")) {
    try {
      const url = new URL(phone);
      if (url.username || url.password || url.port) return null;

      if (url.hostname === "wa.me") {
        phone = url.pathname.replace(/^\//, "").replace(/\/$/, "");
      } else if (url.hostname === "api.whatsapp.com" && url.pathname === "/send") {
        phone = url.searchParams.get("phone") ?? "";
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

  // Only accept phone formatting, never arbitrary URLs, extensions or text.
  if (!/^\+?[\d\s().-]+$/.test(phone)) return null;
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  if (!/^[1-9]\d{6,14}$/.test(digits)) return null;

  return `https://wa.me/${digits}`;
}
