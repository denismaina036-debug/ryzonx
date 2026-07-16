import { SYSTEM_TEMPLATES } from "./system";
import { INVESTMENT_TEMPLATES } from "./investments";
import { WITHDRAWAL_TEMPLATES } from "./withdrawals";
import { POOL_MANAGER_TEMPLATES } from "./pool-manager";
import {
  MARKETPLACE_TEMPLATES,
  STATEMENT_TEMPLATES,
  SUPPORT_TEMPLATES,
  PLATFORM_TEMPLATES,
} from "./remaining";
import { AUTOMATION_TEMPLATES } from "./automation";
import type { EmailCatalogEntry } from "./helpers";

export const EMAIL_TEMPLATE_CATALOG: EmailCatalogEntry[] = [
  ...SYSTEM_TEMPLATES,
  ...INVESTMENT_TEMPLATES,
  ...WITHDRAWAL_TEMPLATES,
  ...POOL_MANAGER_TEMPLATES,
  ...MARKETPLACE_TEMPLATES,
  ...STATEMENT_TEMPLATES,
  ...SUPPORT_TEMPLATES,
  ...PLATFORM_TEMPLATES,
  ...AUTOMATION_TEMPLATES,
];

export function getCatalogEntry(slug: string): EmailCatalogEntry | undefined {
  return EMAIL_TEMPLATE_CATALOG.find((t) => t.slug === slug);
}

export function getCatalogByCategory(category: string): EmailCatalogEntry[] {
  return EMAIL_TEMPLATE_CATALOG.filter((t) => t.category === category);
}

export { SYSTEM_TEMPLATES, INVESTMENT_TEMPLATES, WITHDRAWAL_TEMPLATES, POOL_MANAGER_TEMPLATES };
