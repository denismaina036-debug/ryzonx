import { createAdminClient } from "@/lib/supabase/admin";
import { USER_ROLES } from "@/constants/roles";
import { env } from "@/lib/env";
import type { CommunicationPriority } from "@/domain/communication/types";
import { ADMIN_ALERT_SLUG } from "@/services/communication/event-registry";
import { communicationTriggers } from "@/services/communication/communication-triggers.service";

async function listAdministratorIds(): Promise<string[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("role", USER_ROLES.ADMINISTRATOR);

  return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
}

export const adminNotifyService = {
  async notifyAll(input: {
    templateSlug?: string;
    title: string;
    body: string;
    variables?: Record<string, string | number | boolean | null | undefined>;
    relatedEntityType?: string;
    relatedEntityId?: string;
    triggeredBy?: string | null;
    channels?: ("email" | "in_app")[];
    metadata?: Record<string, unknown>;
    priority?: CommunicationPriority;
  }): Promise<void> {
    const adminIds = await listAdministratorIds();
    const slug = input.templateSlug ?? ADMIN_ALERT_SLUG;

    await Promise.all(
      adminIds.map((adminId) =>
        communicationTriggers.notify({
          templateSlug: slug,
          recipientUserId: adminId,
          variables: {
            event_title: input.title,
            event_body: input.body,
            announcement_title: input.title,
            announcement_body: input.body,
            announcement_preview: input.body.slice(0, 120),
            dashboard_link: `${env.NEXT_PUBLIC_APP_URL}/admin`,
            ...input.variables,
          },
          metadata: {
            admin_alert: true,
            related_entity_type: input.relatedEntityType,
            related_entity_id: input.relatedEntityId,
            ...input.metadata,
          },
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          triggeredBy: input.triggeredBy ?? null,
          channels: input.channels ?? ["in_app"],
          priority: input.priority ?? "high",
          category: "system",
        })
      )
    );
  },

  async newDeposit(input: {
    amount: string;
    userName: string;
    transactionId: string;
    triggeredBy?: string | null;
  }): Promise<void> {
    await this.notifyAll({
      templateSlug: "admin_new_deposit",
      title: "New deposit submitted",
      body: `${input.userName} submitted a deposit of ${input.amount}.`,
      variables: {
        deposit_amount: input.amount,
        transaction_id: input.transactionId,
      },
      relatedEntityType: "transaction",
      relatedEntityId: input.transactionId,
      triggeredBy: input.triggeredBy,
    });
  },

  async newWithdrawal(input: {
    amount: string;
    userName: string;
    transactionId: string;
    triggeredBy?: string | null;
  }): Promise<void> {
    await this.notifyAll({
      templateSlug: "admin_new_withdrawal",
      title: "New withdrawal request",
      body: `${input.userName} requested a withdrawal of ${input.amount}.`,
      variables: {
        withdrawal_amount: input.amount,
        transaction_id: input.transactionId,
      },
      relatedEntityType: "transaction",
      relatedEntityId: input.transactionId,
      triggeredBy: input.triggeredBy,
    });
  },

  async newPmApplication(input: {
    applicantName: string;
    applicationId: string;
    triggeredBy?: string | null;
  }): Promise<void> {
    await this.notifyAll({
      templateSlug: "admin_new_pm_application",
      title: "New Pool Manager application",
      body: `${input.applicantName} submitted a Pool Manager application.`,
      variables: { manager_name: input.applicantName, application_status: "Pending" },
      relatedEntityType: "pm_application",
      relatedEntityId: input.applicationId,
      triggeredBy: input.triggeredBy,
    });
  },

  async supportTicket(input: {
    subject: string;
    ticketId: string;
    userName: string;
    triggeredBy?: string | null;
  }): Promise<void> {
    await this.notifyAll({
      templateSlug: "admin_support_ticket",
      title: "New support ticket",
      body: `${input.userName}: ${input.subject}`,
      variables: { support_ticket: input.subject },
      relatedEntityType: "support_ticket",
      relatedEntityId: input.ticketId,
      triggeredBy: input.triggeredBy,
    });
  },

  async communicationFailure(input: {
    templateSlug: string;
    recipientEmail: string;
    error: string;
  }): Promise<void> {
    await this.notifyAll({
      templateSlug: "admin_communication_failure",
      title: "Communication delivery failed",
      body: `Template ${input.templateSlug} to ${input.recipientEmail}: ${input.error}`,
      variables: {
        announcement_title: "Communication delivery failed",
        announcement_body: input.error,
      },
      channels: ["in_app"],
    });
  },

  async platformAlert(input: {
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    triggeredBy?: string | null;
  }): Promise<void> {
    await this.notifyAll({
      templateSlug: ADMIN_ALERT_SLUG,
      title: input.title,
      body: input.message,
      variables: {
        event_title: input.title,
        event_body: input.message,
        announcement_title: input.title,
        announcement_body: input.message,
      },
      metadata: input.metadata,
      triggeredBy: input.triggeredBy,
      channels: ["in_app"],
      priority: "high",
    });
  },
};
