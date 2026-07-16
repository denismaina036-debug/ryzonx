import type { CommunicationCategory } from "@/domain/communication/types";
import type { TemplateVariableSchema } from "@/domain/communication/types";
import type { EmailTemplateSpec } from "../types";

export interface EmailCatalogEntry {
  slug: string;
  name: string;
  category: CommunicationCategory;
  description: string;
  subjectTemplate: string;
  emailSpec: EmailTemplateSpec;
  variablesSchema: TemplateVariableSchema[];
  defaultChannels: ("email" | "in_app")[];
  inAppTitleTemplate?: string;
  inAppBodyTemplate?: string;
}

export const STANDARD_VARIABLES: TemplateVariableSchema[] = [
  { key: "first_name", label: "First name", sample: "Paul", required: true },
  { key: "last_name", label: "Last name", sample: "Morgan" },
  { key: "dashboard_link", label: "Dashboard URL", sample: "https://app.ryvonx.com/dashboard" },
  { key: "preferences_url", label: "Preferences URL", sample: "https://app.ryvonx.com/dashboard/settings" },
];

export function baseVars(extra: TemplateVariableSchema[] = []): TemplateVariableSchema[] {
  return [...STANDARD_VARIABLES, ...extra];
}

export function defineEmailTemplate(entry: EmailCatalogEntry): EmailCatalogEntry {
  return entry;
}

export function dashboardCta(label = "View Dashboard"): EmailTemplateSpec["primaryAction"] {
  return { label, urlKey: "dashboard_link" };
}
