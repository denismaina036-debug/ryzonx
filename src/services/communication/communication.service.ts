import { ACTIVE_CHANNELS } from "@/constants/communication";
import {
  COMMUNICATION_AUDIT_ACTIONS,
  COMMUNICATION_ENTITY_TYPE,
} from "@/constants/communication";
import type {
  CommunicationChannel,
  CommunicationSendInput,
  CommunicationSendResult,
  CommunicationStatus,
  TemplatePreviewInput,
  TemplatePreviewResult,
} from "@/domain/communication/types";
import { auditService } from "@/services/audit.service";
import { communicationRepository } from "@/services/communication/communication-repository";
import { getChannelAdapter } from "@/services/communication/channels";
import { isDeliveryAllowed } from "@/services/communication/preference-check";
import {
  buildSampleVariables,
  mergeVariables,
} from "@/services/communication/template-engine";
import { renderTemplateWithPremium } from "@/services/communication/email/catalog-bridge";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";

const RETRY_DELAY_MS = 5 * 60 * 1000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

import {
  resolveNotificationType,
} from "@/services/communication/event-registry";
import { emailQueueService } from "@/services/communication/email/email-queue.service";

function resolveTemplateDbId(templateId: string | null | undefined): string | null {
  if (!templateId) return null;
  return UUID_PATTERN.test(templateId) ? templateId : null;
}

function aggregateStatus(
  deliveryStatuses: CommunicationStatus[]
): CommunicationStatus {
  if (deliveryStatuses.length === 0) return "failed";
  if (deliveryStatuses.every((s) => s === "delivered")) return "delivered";
  if (deliveryStatuses.some((s) => s === "failed") && deliveryStatuses.every((s) => s !== "delivered" && s !== "sent" && s !== "queued")) {
    return "failed";
  }
  if (deliveryStatuses.some((s) => s === "queued")) return "queued";
  if (deliveryStatuses.some((s) => s === "sent")) return "sent";
  return "sent";
}

export const communicationService = {
  /**
   * Central entry point for all platform communications.
   * Modules must call this — never Resend or notifications table directly.
   */
  async send(input: CommunicationSendInput): Promise<CommunicationSendResult> {
    const template = await communicationRepository.getTemplateBySlug(input.templateSlug);
    if (!template) {
      throw new Error(`Communication template not found: ${input.templateSlug}`);
    }

    const category = input.category ?? template.category;
    const priority = input.priority ?? "normal";
    const channels = (input.channels ?? template.defaultChannels).filter((c) =>
      ACTIVE_CHANNELS.includes(c)
    );

    if (channels.length === 0) {
      throw new Error("No active delivery channels configured.");
    }

    const variables = mergeVariables(template.variablesSchema, input.variables);
    const rendered = renderTemplateWithPremium(template, variables);
    const recipientEmail = await communicationRepository.getRecipientEmail(
      input.recipientUserId
    );

    const communicationId = await communicationRepository.createCommunication({
      recipientUserId: input.recipientUserId,
      templateId: resolveTemplateDbId(template.id),
      templateSlug: template.slug,
      category,
      priority,
      variables,
      renderedSubject: rendered.subject,
      renderedBody: rendered.body,
      renderedInAppTitle: rendered.inAppTitle,
      renderedInAppBody: rendered.inAppBody,
      metadata: {
        ...(input.metadata ?? {}),
        rendered_html: rendered.html ?? null,
        rendered_plain_text: rendered.plainText ?? rendered.body,
        template_category: category,
        template_priority: priority,
      },
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      triggeredBy: input.triggeredBy ?? null,
    });

    const notificationType = resolveNotificationType(
      template.slug,
      input.notificationType
    );

    const deliveryResults: CommunicationSendResult["deliveries"] = [];

    for (const channel of channels) {
      const allowed = await isDeliveryAllowed({
        userId: input.recipientUserId,
        category,
        channel,
        priority,
      });

      if (!allowed) {
        const deliveryId = await communicationRepository.createDelivery({
          communicationId,
          channel,
          recipientAddress: channel === "email" ? recipientEmail : null,
          status: "archived",
        });
        deliveryResults.push({
          channel,
          status: "archived",
          deliveryId,
          error: "Blocked by user preference",
        });
        continue;
      }

      const deliveryId = await communicationRepository.createDelivery({
        communicationId,
        channel,
        recipientAddress: channel === "email" ? recipientEmail : null,
        status: "sending",
      });

      const adapter = getChannelAdapter(channel);
      if (!adapter) {
        await communicationRepository.updateDelivery(deliveryId, {
          status: "failed",
          errorMessage: `Channel not implemented: ${channel}`,
        });
        deliveryResults.push({
          channel,
          status: "failed",
          deliveryId,
          error: `Channel not implemented: ${channel}`,
        });
        continue;
      }

      const result = await adapter.dispatch({
        communicationId,
        deliveryId,
        recipientUserId: input.recipientUserId,
        recipientEmail,
        rendered: {
          subject: rendered.subject,
          body: rendered.body,
          html: rendered.html,
          plainText: rendered.plainText,
          inAppTitle: rendered.inAppTitle,
          inAppBody: rendered.inAppBody,
        },
        notificationType,
        metadata: {
          ...(input.metadata ?? {}),
          rendered_html: rendered.html ?? null,
          template_category: category,
          template_priority: priority,
        },
        category,
        priority,
      });

      const now = new Date().toISOString();
      await communicationRepository.updateDelivery(deliveryId, {
        status: result.status,
        notificationId: result.notificationId,
        externalId: result.externalId,
        errorMessage: result.error,
        sentAt: result.status === "sent" || result.status === "delivered" ? now : undefined,
        deliveredAt: result.status === "delivered" ? now : undefined,
        nextRetryAt:
          result.status === "failed"
            ? new Date(Date.now() + RETRY_DELAY_MS).toISOString()
            : null,
      });

      deliveryResults.push({
        channel,
        status: result.status,
        deliveryId,
        notificationId: result.notificationId,
        error: result.error,
      });
    }

    const finalStatus = aggregateStatus(deliveryResults.map((d) => d.status));
    const errorSummary = deliveryResults
      .filter((d) => d.error)
      .map((d) => `${d.channel}: ${d.error}`)
      .join("; ");

    await communicationRepository.updateCommunicationStatus(
      communicationId,
      finalStatus,
      errorSummary || undefined
    );

    const actorId = input.triggeredBy ?? input.recipientUserId;
    await auditService.log({
      actorId,
      action:
        finalStatus === "failed"
          ? COMMUNICATION_AUDIT_ACTIONS.SEND_FAILED
          : COMMUNICATION_AUDIT_ACTIONS.SEND,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: communicationId,
      newValues: {
        template_slug: template.slug,
        category,
        priority,
        channels,
        status: finalStatus,
        recipient_user_id: input.recipientUserId,
      },
    });

    return { communicationId, status: finalStatus, deliveries: deliveryResults };
  },

  /** One public Telegram post per composer submission, never one per audience member. */
  async sendTelegramBroadcast(input: {
    requestId: string;
    heading: string;
    html: string;
    plainText: string;
    triggeredBy: string;
  }): Promise<CommunicationSendResult> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    if (!UUID_PATTERN.test(input.requestId)) throw new Error("Invalid publication request identifier.");
    const db = (await import("@/lib/supabase/admin")).createAdminClient();
    const { data: prior } = await db
      .from("communications")
      .select("id, status, communication_deliveries(id, channel, status, notification_id, error_message)")
      .eq("related_entity_type", "admin_telegram_broadcast")
      .eq("related_entity_id", input.requestId)
      .maybeSingle();
    if (prior) {
      const row = prior as Record<string, unknown>;
      const deliveries = ((row.communication_deliveries ?? []) as Array<Record<string, unknown>>).map((delivery) => ({
        channel: delivery.channel as CommunicationChannel,
        status: delivery.status as CommunicationStatus,
        deliveryId: String(delivery.id),
        notificationId: delivery.notification_id ? String(delivery.notification_id) : undefined,
        error: delivery.error_message ? String(delivery.error_message) : undefined,
      }));
      return { communicationId: String(row.id), status: row.status as CommunicationStatus, deliveries };
    }

    let communicationId: string;
    try {
      communicationId = await communicationRepository.createCommunication({
        recipientUserId: input.triggeredBy,
        templateId: null,
        templateSlug: "admin_announcement",
        category: "announcements",
        priority: "normal",
        variables: { announcement_title: input.heading },
        renderedSubject: input.heading,
        renderedBody: input.plainText,
        renderedInAppTitle: null,
        renderedInAppBody: null,
        metadata: {
          admin_message: true,
          telegram_broadcast: true,
          audience: "all",
          telegram_heading: input.heading,
          telegram_html: input.html,
          rendered_plain_text: input.plainText,
        },
        relatedEntityType: "admin_telegram_broadcast",
        relatedEntityId: input.requestId,
        triggeredBy: input.triggeredBy,
      });
    } catch (error) {
      const { data: raced } = await db
        .from("communications")
        .select("id")
        .eq("related_entity_type", "admin_telegram_broadcast")
        .eq("related_entity_id", input.requestId)
        .maybeSingle();
      if (!raced) throw error;
      return this.sendTelegramBroadcast(input);
    }

    const deliveryId = await communicationRepository.createDelivery({ communicationId, channel: "telegram", status: "sending" });
    const adapter = getChannelAdapter("telegram");
    if (!adapter) throw new Error("Telegram channel is unavailable.");
    const result = await adapter.dispatch({
      communicationId,
      deliveryId,
      recipientUserId: input.triggeredBy,
      recipientEmail: null,
      rendered: { subject: input.heading, body: input.plainText, html: input.html, plainText: input.plainText, inAppTitle: null, inAppBody: null },
      notificationType: "announcement",
      category: "announcements",
      priority: "normal",
      metadata: { admin_message: true, telegram_broadcast: true, audience: "all", telegram_heading: input.heading, telegram_html: input.html },
    });
    const now = new Date().toISOString();
    await communicationRepository.updateDelivery(deliveryId, {
      status: result.status,
      externalId: result.externalId,
      errorMessage: result.error,
      sentAt: result.status === "sent" || result.status === "delivered" ? now : undefined,
      deliveredAt: result.status === "delivered" ? now : undefined,
      nextRetryAt: result.status === "failed" ? new Date(Date.now() + RETRY_DELAY_MS).toISOString() : null,
    });
    await communicationRepository.updateCommunicationStatus(communicationId, result.status, result.error);
    return {
      communicationId,
      status: result.status,
      deliveries: [{ channel: "telegram", status: result.status, deliveryId, error: result.error }],
    };
  },

  async getDashboardStats() {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = (await import("@/lib/supabase/admin")).createAdminClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const [
      { count: emailsSentToday },
      { count: failedEmails },
      { count: queuedEmails },
      { count: recentComms },
    ] = await Promise.all([
      db
        .from("communication_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("channel", "email")
        .in("status", ["sent", "delivered"])
        .gte("sent_at", todayIso),
      db
        .from("communication_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("channel", "email")
        .eq("status", "failed"),
      db
        .from("communication_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("channel", "email")
        .eq("status", "queued"),
      db
        .from("communications")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayIso),
    ]);

    const history = await communicationRepository.listRecentHistory(15);
    const failed = await communicationRepository.listFailedDeliveries(10);

    return {
      emailsSentToday: emailsSentToday ?? 0,
      failedEmails: failedEmails ?? 0,
      queuedEmails: queuedEmails ?? 0,
      communicationsToday: recentComms ?? 0,
      recentHistory: history,
      failedDeliveries: failed,
    };
  },

  async processEmailQueue(limit = 25) {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    return emailQueueService.processPending(limit);
  },

  /** Render a template with sample or custom variables — for admin preview. */
  async previewTemplate(input: TemplatePreviewInput): Promise<TemplatePreviewResult> {
    await requireRole(USER_ROLES.ADMINISTRATOR);

    const template = await communicationRepository.getTemplateBySlug(input.slug);
    if (!template) {
      throw new Error(`Template not found: ${input.slug}`);
    }

    const sampleVariables = mergeVariables(template.variablesSchema, input.variables);
    const rendered = renderTemplateWithPremium(template, sampleVariables);

    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.TEMPLATE_PREVIEW,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: template.id,
      newValues: { slug: template.slug, variables: sampleVariables },
    });

    return {
      template,
      rendered,
      sampleVariables,
      email: rendered.html
        ? { html: rendered.html, plainText: rendered.plainText ?? rendered.body }
        : undefined,
    };
  },

  async listTemplates() {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    return communicationRepository.listTemplates();
  },

  async listHistory(limit = 50) {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    return communicationRepository.listRecentHistory(limit);
  },

  async listFailedDeliveries(limit = 50) {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    return communicationRepository.listFailedDeliveries(limit);
  },

  /** Retry a failed delivery (admin action). */
  async retryDelivery(deliveryId: string): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = (await import("@/lib/supabase/admin")).createAdminClient();

    const { data: delivery } = await db
      .from("communication_deliveries")
      .select("id, channel, communication_id, retry_count, max_retries, recipient_address, status")
      .eq("id", deliveryId)
      .maybeSingle();

    if (!delivery) throw new Error("Delivery not found.");

    const row = delivery as {
      id: string;
      channel: CommunicationChannel;
      communication_id: string;
      retry_count: number;
      max_retries: number;
      recipient_address: string | null;
      status: CommunicationStatus;
    };

    if (row.retry_count >= row.max_retries) {
      throw new Error("Maximum retry attempts reached.");
    }

    if (row.channel === "email") {
      await communicationRepository.updateDelivery(deliveryId, {
        status: "queued",
        retryCount: row.retry_count + 1,
      });

      const result = await emailQueueService.processDelivery({
        id: deliveryId,
        communication_id: row.communication_id,
        channel: "email",
        status: "queued",
        recipient_address: row.recipient_address,
        retry_count: row.retry_count + 1,
        max_retries: row.max_retries,
      });

      const user = await requireRole(USER_ROLES.ADMINISTRATOR);
      await auditService.log({
        actorId: user.id,
        action: COMMUNICATION_AUDIT_ACTIONS.DELIVERY_RETRY,
        entityType: COMMUNICATION_ENTITY_TYPE,
        entityId: deliveryId,
        newValues: { status: result === "sent" ? "sent" : "failed", channel: "email" },
      });
      return;
    }

    const { data: commRow } = await db
      .from("communications")
      .select(
        "recipient_user_id, rendered_subject, rendered_body, rendered_in_app_title, rendered_in_app_body, template_slug, metadata"
      )
      .eq("id", row.communication_id)
      .maybeSingle();

    const comm = commRow as {
      recipient_user_id: string;
      rendered_subject: string | null;
      rendered_body: string;
      rendered_in_app_title: string | null;
      rendered_in_app_body: string | null;
      template_slug: string | null;
      metadata: Record<string, unknown> | null;
    } | null;

    if (!comm) throw new Error("Communication record missing.");

    const adapter = getChannelAdapter(row.channel);
    if (!adapter) throw new Error(`Channel not implemented: ${row.channel}`);

    const recipientEmail = await communicationRepository.getRecipientEmail(
      comm.recipient_user_id
    );

    await communicationRepository.updateDelivery(deliveryId, {
      status: "sending",
      retryCount: row.retry_count + 1,
    });

    const result = await adapter.dispatch({
      communicationId: row.communication_id,
      deliveryId,
      recipientUserId: comm.recipient_user_id,
      recipientEmail,
      rendered: {
        subject: comm.rendered_subject,
        body: comm.rendered_body,
        inAppTitle: comm.rendered_in_app_title,
        inAppBody: comm.rendered_in_app_body,
      },
      notificationType: resolveNotificationType(comm.template_slug ?? "system"),
      metadata: comm.metadata ?? undefined,
    });

    const now = new Date().toISOString();
    await communicationRepository.updateDelivery(deliveryId, {
      status: result.status,
      notificationId: result.notificationId,
      externalId: result.externalId,
      errorMessage: result.error,
      sentAt: result.status !== "failed" ? now : undefined,
      deliveredAt: result.status === "delivered" ? now : undefined,
      nextRetryAt:
        result.status === "failed"
          ? new Date(Date.now() + RETRY_DELAY_MS).toISOString()
          : null,
    });

    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    await auditService.log({
      actorId: user.id,
      action: COMMUNICATION_AUDIT_ACTIONS.DELIVERY_RETRY,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: deliveryId,
      newValues: { status: result.status },
    });
  },

  buildSampleVariables,
};
