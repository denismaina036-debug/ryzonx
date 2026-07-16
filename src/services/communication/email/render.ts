import { EMAIL_COLORS } from "./tokens";
import { emailHeader } from "./components/header";
import { emailGreeting } from "./components/greeting";
import { emailIntro, emailPrimaryButton, emailSecondaryButton } from "./components/content";
import { emailSupportSection, emailFooter } from "./components/footer";
import { emailStatusBadge } from "./components/badge";
import { emailContentCard } from "./components/content";
import { renderEmailBlocks, type EmailTemplateSpec } from "./types";
import { interpolateTemplate } from "../template-engine";

export interface RenderPremiumEmailInput {
  spec: EmailTemplateSpec;
  variables: Record<string, string>;
  subject?: string;
}

export interface RenderPremiumEmailResult {
  subject: string;
  html: string;
  plainText: string;
}

function interpolateSpec(
  spec: EmailTemplateSpec,
  variables: Record<string, string>
): EmailTemplateSpec {
  const iv = (s: string) => interpolateTemplate(s, variables);

  return {
    ...spec,
    title: iv(spec.title),
    intro: iv(spec.intro),
    badge: spec.badge
      ? { label: iv(spec.badge.label), variant: spec.badge.variant }
      : undefined,
    blocks: spec.blocks?.map((block) => {
      switch (block.type) {
        case "paragraph":
        case "alert":
          return { ...block, text: iv(block.text) };
        case "info_card":
          return { ...block, label: iv(block.label), value: iv(block.value) };
        case "metric_row":
          return {
            ...block,
            items: block.items.map((i) => ({
              label: iv(i.label),
              value: iv(i.value),
            })),
          };
        case "timeline":
          return {
            ...block,
            items: block.items.map((i) => ({
              label: iv(i.label),
              value: iv(i.value),
            })),
          };
        case "badge":
          return { ...block, label: iv(block.label) };
        case "html":
          return { ...block, content: iv(block.content) };
        default:
          return block;
      }
    }),
    primaryAction: spec.primaryAction
      ? { label: iv(spec.primaryAction.label), urlKey: spec.primaryAction.urlKey }
      : undefined,
    secondaryAction: spec.secondaryAction
      ? { label: iv(spec.secondaryAction.label), urlKey: spec.secondaryAction.urlKey }
      : undefined,
  };
}

export function renderPremiumEmail(input: RenderPremiumEmailInput): RenderPremiumEmailResult {
  const spec = interpolateSpec(input.spec, input.variables);
  const firstName = variablesFirstName(input.variables);

  const sections: string[] = [
    emailHeader(spec.title),
    emailGreeting(firstName),
    emailIntro(spec.intro),
  ];

  if (spec.badge) {
    sections.push(
      emailContentCard(
        `<p style="margin:0;">${emailStatusBadge(spec.badge.label, spec.badge.variant)}</p>`
      )
    );
  }

  if (spec.blocks?.length) {
    sections.push(renderEmailBlocks(spec.blocks));
  }

  if (spec.primaryAction) {
    const url = input.variables[spec.primaryAction.urlKey] ?? "#";
    sections.push(emailPrimaryButton(spec.primaryAction.label, url));
  }

  if (spec.secondaryAction) {
    const url = input.variables[spec.secondaryAction.urlKey] ?? "#";
    sections.push(emailSecondaryButton(spec.secondaryAction.label, url));
  }

  if (spec.showSupport !== false) {
    sections.push(emailSupportSection());
  }

  sections.push(
    emailFooter({
      preferencesUrl: input.variables.preferences_url,
      unsubscribeUrl: input.variables.unsubscribe_url,
      showUnsubscribe: spec.showUnsubscribe,
    })
  );

  const html = wrapEmailDocument(sections.join("\n"));
  const subject =
    input.subject ??
    interpolateTemplate(input.spec.title, input.variables);

  const plainText = buildPlainText(spec, input.variables, subject);

  return { subject, html, plainText };
}

function variablesFirstName(variables: Record<string, string>): string {
  return variables.first_name ?? variables.fullName?.split(" ")[0] ?? "there";
}

function wrapEmailDocument(bodyRows: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>RyvonX</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.background};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${EMAIL_COLORS.background};">
    ${bodyRows}
  </table>
</body>
</html>`;
}

function buildPlainText(
  spec: EmailTemplateSpec,
  variables: Record<string, string>,
  subject: string
): string {
  const lines = [
    subject,
    "",
    `Hello ${variablesFirstName(variables)},`,
    "",
    spec.intro,
    "",
  ];
  if (spec.primaryAction) {
    const url = variables[spec.primaryAction.urlKey] ?? "";
    lines.push(`${spec.primaryAction.label}: ${url}`);
  }
  lines.push("", "— RyvonX");
  return lines.join("\n");
}

export { interpolateTemplate };
