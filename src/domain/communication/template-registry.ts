import type { CommunicationTemplate } from "./types";
import { EMAIL_TEMPLATE_CATALOG } from "@/services/communication/email/catalog";
import { catalogEntryToCommunicationTemplate } from "@/services/communication/email/catalog-bridge";

/**
 * Offline fallback registry — full premium catalog for preview when DB is not yet migrated.
 */
export const COMMUNICATION_TEMPLATE_REGISTRY: CommunicationTemplate[] =
  EMAIL_TEMPLATE_CATALOG.map((entry) => catalogEntryToCommunicationTemplate(entry));

export function getRegistryTemplate(slug: string): CommunicationTemplate | undefined {
  return COMMUNICATION_TEMPLATE_REGISTRY.find((t) => t.slug === slug);
}
