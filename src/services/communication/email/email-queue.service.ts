import { createAdminClient } from "@/lib/supabase/admin";
import type { CommunicationChannel, CommunicationStatus } from "@/domain/communication/types";
import { sendResendEmail, isResendConfigured } from "./resend.service";
import { COMMUNICATION_AUDIT_ACTIONS, COMMUNICATION_ENTITY_TYPE } from "@/constants/communication";
import { auditService } from "@/services/audit.service";
import { adminNotifyService } from "@/services/communication/admin-notify.service";

type QueuedDeliveryRow = {
  id: string;
  communication_id: string;
  channel: CommunicationChannel;
  status: CommunicationStatus;
  recipient_address: string | null;
  retry_count: number;
  max_retries: number;
};

type CommunicationRow = {
  rendered_subject: string | null;
  rendered_body: string;
  metadata: Record<string, unknown> | null;
  template_slug: string | null;
};

const RETRY_DELAY_MS = 5 * 60 * 1000;

export const emailQueueService = {
  async processPending(limit = 25): Promise<{ processed: number; sent: number; failed: number }> {
    if (!isResendConfigured()) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    const db = createAdminClient();
    const now = new Date().toISOString();

    const { data: retryRows } = await db
      .from("communication_deliveries")
      .select("id, communication_id, channel, status, recipient_address, retry_count, max_retries")
      .eq("channel", "email")
      .eq("status", "failed")
      .lte("next_retry_at", now)
      .order("updated_at", { ascending: true })
      .limit(limit);

    const { data: queuedRows } = await db
      .from("communication_deliveries")
      .select("id, communication_id, channel, status, recipient_address, retry_count, max_retries")
      .eq("channel", "email")
      .eq("status", "queued")
      .order("queued_at", { ascending: true })
      .limit(limit);

    const deliveries = [
      ...((retryRows ?? []) as QueuedDeliveryRow[]),
      ...((queuedRows ?? []) as QueuedDeliveryRow[]),
    ].slice(0, limit);

    let sent = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      const result = await this.processDelivery(delivery);
      if (result === "sent") sent += 1;
      if (result === "failed") failed += 1;
    }

    return { processed: deliveries.length, sent, failed };
  },

  async processDelivery(delivery: QueuedDeliveryRow): Promise<"sent" | "failed" | "skipped"> {
    const db = createAdminClient();

    if (!delivery.recipient_address?.trim()) {
      await db
        .from("communication_deliveries")
        .update({
          status: "failed",
          error_message: "Missing recipient email address.",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", delivery.id);
      return "failed";
    }

    const { data: comm } = await db
      .from("communications")
      .select("rendered_subject, rendered_body, metadata, template_slug")
      .eq("id", delivery.communication_id)
      .maybeSingle();

    if (!comm) {
      await db
        .from("communication_deliveries")
        .update({
          status: "failed",
          error_message: "Communication record missing.",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", delivery.id);
      return "failed";
    }

    const row = comm as CommunicationRow;
    const metadata = row.metadata ?? {};
    const html = (metadata.rendered_html as string | undefined) ?? undefined;
    const plainText =
      (metadata.rendered_plain_text as string | undefined) ?? row.rendered_body;
    const subject = row.rendered_subject ?? "RyvonX";

    if (!html && !plainText.trim()) {
      await db
        .from("communication_deliveries")
        .update({
          status: "failed",
          error_message: "No email content to send.",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", delivery.id);
      return "failed";
    }

    await db
      .from("communication_deliveries")
      .update({ status: "sending", updated_at: new Date().toISOString() } as never)
      .eq("id", delivery.id);

    try {
      const resendResult = await sendResendEmail({
        to: delivery.recipient_address,
        subject,
        html: html ?? `<pre>${plainText}</pre>`,
        text: plainText,
      });

      const now = new Date().toISOString();
      await db
        .from("communication_deliveries")
        .update({
          status: "sent",
          external_id: resendResult.id,
          sent_at: now,
          error_message: null,
          updated_at: now,
        } as never)
        .eq("id", delivery.id);

      await db
        .from("communications")
        .update({ status: "sent", updated_at: now } as never)
        .eq("id", delivery.communication_id);

      return "sent";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email send failed";
      const retryCount = delivery.retry_count + 1;
      const exhausted = retryCount >= delivery.max_retries;

      await db
        .from("communication_deliveries")
        .update({
          status: "failed",
          error_message: message,
          retry_count: retryCount,
          next_retry_at: exhausted
            ? null
            : new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", delivery.id);

      if (exhausted) {
        await adminNotifyService.communicationFailure({
          templateSlug: row.template_slug ?? "unknown",
          recipientEmail: delivery.recipient_address,
          error: message,
        });
        await auditService.log({
          actorId: delivery.communication_id,
          action: COMMUNICATION_AUDIT_ACTIONS.SEND_FAILED,
          entityType: COMMUNICATION_ENTITY_TYPE,
          entityId: delivery.id,
          newValues: { channel: "email", error: message },
        });
      }

      return "failed";
    }
  },
};
