import { landingPageService } from "@/services/landing-page.service";
import { getWhatsAppSupportUrl } from "@/lib/support/whatsapp";
import { SupportLauncher } from "./support-launcher";

export async function WhatsAppSupport() {
  const content = await landingPageService.getRawContent();
  return <SupportLauncher whatsappUrl={getWhatsAppSupportUrl(content.contact.whatsapp)} />;
}
