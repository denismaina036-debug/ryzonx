import type { CommunicationChannelAdapter, ChannelDispatchResult } from "./types";
import { sendResendEmail, isResendConfigured } from "@/services/communication/email/resend.service";
import { getOutboundEmailConfig } from "@/services/communication/email/email-config.service";

/**
 * Email channel — sends immediately via Resend when configured.
 */
export const emailChannel: CommunicationChannelAdapter = {
  channel: "email",

  async dispatch(ctx): Promise<ChannelDispatchResult> {
    if (!ctx.recipientEmail?.trim()) {
      return { status: "failed", error: "Recipient has no email address." };
    }

    const metadata = ctx.metadata ?? {};
    const html =
      (ctx.rendered.html as string | null | undefined) ??
      (metadata.rendered_html as string | undefined) ??
      null;
    const plainText =
      ctx.rendered.plainText ??
      (metadata.rendered_plain_text as string | undefined) ??
      ctx.rendered.body;
    const subject = ctx.rendered.subject ?? "RyvonX";

    if (!html?.trim() && !plainText?.trim()) {
      return { status: "failed", error: "No email content to deliver." };
    }

    if (!isResendConfigured()) {
      return { status: "failed", error: "RESEND_API_KEY is not configured." };
    }

    try {
      const emailConfig = await getOutboundEmailConfig();
      const result = await sendResendEmail({
        to: ctx.recipientEmail.trim(),
        subject,
        html: html ?? `<pre>${plainText}</pre>`,
        text: plainText,
        replyTo: emailConfig.replyTo,
        from: emailConfig.from,
      });

      return {
        status: "sent",
        externalId: result.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email send failed";
      return { status: "failed", error: message };
    }
  },
};
