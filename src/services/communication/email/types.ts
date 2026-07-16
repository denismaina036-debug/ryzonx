import type { EmailBadgeVariant } from "./components/badge";
import { emailStatusBadge } from "./components/badge";
import {
  emailAlertBox,
  emailTimelineBlock,
  type AlertVariant,
} from "./components/alert";
import {
  emailContentCard,
  emailDivider,
  emailInfoCard,
  emailMetricRow,
  emailParagraph,
} from "./components/content";

export type EmailBlock =
  | { type: "paragraph"; text: string }
  | { type: "info_card"; label: string; value: string }
  | { type: "metric_row"; items: Array<{ label: string; value: string }> }
  | { type: "alert"; variant: AlertVariant; text: string }
  | { type: "timeline"; items: Array<{ label: string; value: string }> }
  | { type: "divider" }
  | { type: "badge"; label: string; variant: EmailBadgeVariant }
  | { type: "html"; content: string };

export interface EmailTemplateSpec {
  title: string;
  intro: string;
  badge?: { label: string; variant: EmailBadgeVariant };
  blocks?: EmailBlock[];
  showSupport?: boolean;
  showUnsubscribe?: boolean;
  primaryAction?: { label: string; urlKey: string };
  secondaryAction?: { label: string; urlKey: string };
}

export function renderEmailBlocks(blocks: EmailBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        parts.push(emailParagraph(block.text));
        break;
      case "info_card":
        parts.push(emailInfoCard(block.label, block.value));
        break;
      case "metric_row":
        parts.push(emailMetricRow(block.items));
        break;
      case "alert":
        parts.push(emailAlertBox(block.text, block.variant));
        break;
      case "timeline":
        parts.push(emailTimelineBlock(block.items));
        break;
      case "divider":
        parts.push(emailDivider());
        break;
      case "badge":
        parts.push(`<p style="margin:0 0 16px;">${emailStatusBadge(block.label, block.variant)}</p>`);
        break;
      case "html":
        parts.push(block.content);
        break;
    }
  }

  return emailContentCard(parts.join("\n"));
}

export type { EmailTemplateSpec as PremiumEmailSpec };
