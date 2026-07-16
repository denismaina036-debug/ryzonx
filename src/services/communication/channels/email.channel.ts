import type { CommunicationChannelAdapter, ChannelDispatchResult } from "./types";

/**
 * Email channel stub — queues delivery without calling Resend (Phase 5.5.2+).
 * Records intent in communication_deliveries for admin review and future send.
 */
export const emailChannel: CommunicationChannelAdapter = {
  channel: "email",

  async dispatch(ctx): Promise<ChannelDispatchResult> {
    if (!ctx.recipientEmail) {
      return { status: "failed", error: "Recipient has no email address." };
    }

    const subject = ctx.rendered.subject ?? "RyvonX";
    const body = ctx.rendered.body;

    if (!body.trim()) {
      return { status: "failed", error: "No email body content to deliver." };
    }

    // Resend integration deferred — mark as queued for outbound processor
    void subject;

    return {
      status: "queued",
    };
  },
};
