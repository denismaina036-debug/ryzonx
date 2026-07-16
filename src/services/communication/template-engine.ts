import type {
  CommunicationTemplate,
  RenderedCommunication,
  TemplateVariableSchema,
} from "@/domain/communication/types";

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

/**
 * Replace {{variable}} placeholders with string values.
 * Missing keys render as empty string.
 */
export function interpolateTemplate(
  template: string | null | undefined,
  variables: Record<string, string | number | boolean | null | undefined>
): string {
  if (!template) return "";

  return template.replace(VARIABLE_PATTERN, (_, key: string) => {
    const value = variables[key];
    if (value == null) return "";
    return String(value);
  });
}

export function buildSampleVariables(
  schema: TemplateVariableSchema[]
): Record<string, string> {
  const samples: Record<string, string> = {};
  for (const field of schema) {
    samples[field.key] = field.sample ?? `[${field.label}]`;
  }
  return samples;
}

export function mergeVariables(
  schema: TemplateVariableSchema[],
  overrides?: Record<string, string | number | boolean | null | undefined>
): Record<string, string> {
  const merged = buildSampleVariables(schema);
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value != null) merged[key] = String(value);
    }
  }
  return merged;
}

export function renderTemplate(
  template: CommunicationTemplate,
  variables: Record<string, string | number | boolean | null | undefined>
): RenderedCommunication {
  const stringVars = Object.fromEntries(
    Object.entries(variables).map(([k, v]) => [k, v == null ? "" : String(v)])
  ) as Record<string, string>;

  return {
    subject: template.subjectTemplate
      ? interpolateTemplate(template.subjectTemplate, stringVars)
      : null,
    body: interpolateTemplate(template.bodyTemplate, stringVars),
    inAppTitle: template.inAppTitleTemplate
      ? interpolateTemplate(template.inAppTitleTemplate, stringVars)
      : null,
    inAppBody: template.inAppBodyTemplate
      ? interpolateTemplate(template.inAppBodyTemplate, stringVars)
      : null,
  };
}

export function extractTemplateVariables(template: string): string[] {
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(VARIABLE_PATTERN.source, "g");
  while ((match = re.exec(template)) !== null) {
    keys.add(match[1]!);
  }
  return [...keys];
}
