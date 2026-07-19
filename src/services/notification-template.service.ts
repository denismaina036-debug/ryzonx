import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { emailTemplateService } from "@/services/communication/email-template.service";
import type { CommunicationTemplate } from "@/domain/communication/types";

/**
 * Notification template access — delegates to the Communication Engine template system.
 */
export const notificationTemplateService = {
  async listActive(): Promise<CommunicationTemplate[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    return emailTemplateService.listTemplates();
  },

  async getBySlug(slug: string): Promise<CommunicationTemplate | null> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const templates = await emailTemplateService.listTemplates();
    return templates.find((t) => t.slug === slug) ?? null;
  },
};
