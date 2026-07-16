import type { CommunicationTemplate } from "@/domain/communication/types";
import { renderPremiumEmail } from "./render";
import { interpolateTemplate } from "../template-engine";
import type { EmailCatalogEntry } from "./catalog/helpers";

export function catalogEntryToCommunicationTemplate(
  entry: EmailCatalogEntry,
  overrides?: Partial<CommunicationTemplate>
): CommunicationTemplate {
  const samples = Object.fromEntries(
    entry.variablesSchema.map((field) => [field.key, field.sample ?? `[${field.label}]`])
  ) as Record<string, string>;

  const subject = interpolateTemplate(entry.subjectTemplate, samples);
  const premium = renderPremiumEmail({
    spec: entry.emailSpec,
    variables: samples,
    subject,
  });

  return {
    id: overrides?.id ?? `catalog-${entry.slug}`,
    slug: entry.slug,
    name: entry.name,
    category: entry.category,
    description: entry.description,
    subjectTemplate: entry.subjectTemplate,
    bodyTemplate: premium.plainText,
    emailSpec: entry.emailSpec,
    inAppTitleTemplate: entry.inAppTitleTemplate ?? null,
    inAppBodyTemplate: entry.inAppBodyTemplate ?? null,
    variablesSchema: entry.variablesSchema,
    defaultChannels: entry.defaultChannels,
    isActive: overrides?.isActive ?? true,
    isArchived: overrides?.isArchived ?? false,
    version: overrides?.version ?? 1,
    createdAt: overrides?.createdAt ?? "",
    updatedAt: overrides?.updatedAt ?? "",
    lastEditedBy: overrides?.lastEditedBy ?? null,
  };
}

export function renderTemplateWithPremium(
  template: CommunicationTemplate,
  variables: Record<string, string>
) {
  if (template.emailSpec) {
    const subject = template.subjectTemplate
      ? interpolateTemplate(template.subjectTemplate, variables)
      : undefined;
    const premium = renderPremiumEmail({
      spec: template.emailSpec,
      variables,
      subject,
    });
    return {
      subject: premium.subject,
      body: premium.plainText,
      html: premium.html,
      plainText: premium.plainText,
      inAppTitle: template.inAppTitleTemplate
        ? interpolateTemplate(template.inAppTitleTemplate, variables)
        : null,
      inAppBody: template.inAppBodyTemplate
        ? interpolateTemplate(template.inAppBodyTemplate, variables)
        : null,
    };
  }

  const subject = template.subjectTemplate
    ? interpolateTemplate(template.subjectTemplate, variables)
    : null;
  const body = interpolateTemplate(template.bodyTemplate, variables);

  return {
    subject,
    body,
    html: null,
    plainText: body,
    inAppTitle: template.inAppTitleTemplate
      ? interpolateTemplate(template.inAppTitleTemplate, variables)
      : null,
    inAppBody: template.inAppBodyTemplate
      ? interpolateTemplate(template.inAppBodyTemplate, variables)
      : null,
  };
}
