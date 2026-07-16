import type {
  CommunicationCategory,
  CommunicationChannel,
  CommunicationPriority,
  CommunicationSendInput,
} from "@/domain/communication/types";
import { communicationService } from "@/services/communication/communication.service";
import {
  resolveNotificationType,
  TEMPLATE_EVENT_DEFAULTS,
} from "@/services/communication/event-registry";
import { buildUserCommunicationVariables } from "@/services/communication/user-variables";
import { emailQueueService } from "@/services/communication/email/email-queue.service";

export interface TriggerNotifyInput {
  templateSlug: string;
  recipientUserId: string;
  variables?: Record<string, string | number | boolean | null | undefined>;
  category?: CommunicationCategory;
  priority?: CommunicationPriority;
  channels?: CommunicationChannel[];
  metadata?: Record<string, unknown>;
  relatedEntityType?: string;
  relatedEntityId?: string;
  triggeredBy?: string | null;
  notificationType?: string;
  actionUrl?: string;
  actionLabel?: string;
}

function kickEmailQueue(): void {
  void emailQueueService.processPending(25).catch(() => undefined);
}

export const communicationTriggers = {
  /**
   * Safe send — never throws; failures are logged only.
   * All business modules should use this instead of direct notification inserts.
   */
  async notify(input: TriggerNotifyInput): Promise<void> {
    try {
      const defaults = TEMPLATE_EVENT_DEFAULTS[input.templateSlug];
      const variables = await buildUserCommunicationVariables(input.recipientUserId, {
        ...input.variables,
        ...(input.actionUrl ? { dashboard_link: input.actionUrl } : {}),
      });

      const payload: CommunicationSendInput = {
        templateSlug: input.templateSlug,
        recipientUserId: input.recipientUserId,
        variables,
        category: input.category ?? defaults?.category,
        priority: input.priority ?? defaults?.priority ?? "normal",
        channels: input.channels,
        metadata: {
          ...(input.metadata ?? {}),
          action_url: input.actionUrl,
          action_label: input.actionLabel,
        },
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        triggeredBy: input.triggeredBy ?? null,
        notificationType: resolveNotificationType(
          input.templateSlug,
          input.notificationType
        ),
      };

      await communicationService.send(payload);
      kickEmailQueue();
    } catch (err) {
      console.error(
        `[communicationTriggers] Failed: ${input.templateSlug} → ${input.recipientUserId}`,
        err
      );
    }
  },

  async notifyMany(
    recipientUserIds: string[],
    input: Omit<TriggerNotifyInput, "recipientUserId">
  ): Promise<void> {
    await Promise.all(
      recipientUserIds.map((recipientUserId) =>
        this.notify({ ...input, recipientUserId })
      )
    );
  },

  depositSubmitted(input: {
    userId: string;
    amount: number | string;
    transactionId: string;
  }): Promise<void> {
    return this.notify({
      templateSlug: "deposit_submitted",
      recipientUserId: input.userId,
      variables: {
        deposit_amount: String(input.amount),
        transaction_id: input.transactionId,
      },
      relatedEntityType: "transaction",
      relatedEntityId: input.transactionId,
      actionUrl: `/dashboard/deposits`,
      actionLabel: "Track Deposit",
    });
  },

  depositApproved(input: {
    userId: string;
    amount: number | string;
    transactionId: string;
    triggeredBy?: string | null;
  }): Promise<void> {
    return this.notify({
      templateSlug: "deposit_approved",
      recipientUserId: input.userId,
      variables: {
        deposit_amount: String(input.amount),
        amount: String(input.amount),
        transaction_id: input.transactionId,
      },
      relatedEntityType: "transaction",
      relatedEntityId: input.transactionId,
      triggeredBy: input.triggeredBy,
      priority: "high",
    });
  },

  depositRejected(input: {
    userId: string;
    transactionId: string;
    triggeredBy?: string | null;
  }): Promise<void> {
    return this.notify({
      templateSlug: "deposit_rejected",
      recipientUserId: input.userId,
      variables: { transaction_id: input.transactionId },
      relatedEntityType: "transaction",
      relatedEntityId: input.transactionId,
      triggeredBy: input.triggeredBy,
    });
  },

  withdrawalRequested(input: {
    userId: string;
    amount: number | string;
    transactionId: string;
  }): Promise<void> {
    return this.notify({
      templateSlug: "withdrawal_requested",
      recipientUserId: input.userId,
      variables: {
        withdrawal_amount: String(input.amount),
        transaction_id: input.transactionId,
      },
      relatedEntityType: "transaction",
      relatedEntityId: input.transactionId,
    });
  },

  withdrawalApproved(input: {
    userId: string;
    amount: number | string;
    transactionId: string;
    triggeredBy?: string | null;
  }): Promise<void> {
    return this.notify({
      templateSlug: "withdrawal_approved",
      recipientUserId: input.userId,
      variables: {
        withdrawal_amount: String(input.amount),
        amount: String(input.amount),
        transaction_id: input.transactionId,
      },
      relatedEntityType: "transaction",
      relatedEntityId: input.transactionId,
      triggeredBy: input.triggeredBy,
      priority: "high",
    });
  },

  withdrawalRejected(input: {
    userId: string;
    transactionId: string;
    triggeredBy?: string | null;
  }): Promise<void> {
    return this.notify({
      templateSlug: "withdrawal_rejected",
      recipientUserId: input.userId,
      variables: { transaction_id: input.transactionId },
      relatedEntityType: "transaction",
      relatedEntityId: input.transactionId,
      triggeredBy: input.triggeredBy,
    });
  },

  poolInvestmentConfirmed(input: {
    userId: string;
    amount: number | string;
    poolName: string;
    poolId: string;
  }): Promise<void> {
    return this.notify({
      templateSlug: "pool_investment_confirmed",
      recipientUserId: input.userId,
      variables: {
        investment_amount: String(input.amount),
        pool_name: input.poolName,
        poolName: input.poolName,
        amount: String(input.amount),
      },
      relatedEntityType: "fund",
      relatedEntityId: input.poolId,
      actionUrl: `/dashboard/investments`,
    });
  },

  investmentClosed(input: {
    userId: string;
    poolName: string;
    poolId: string;
  }): Promise<void> {
    return this.notify({
      templateSlug: "investment_closed",
      recipientUserId: input.userId,
      variables: { pool_name: input.poolName },
      relatedEntityType: "fund",
      relatedEntityId: input.poolId,
    });
  },

  poolProfitShare(input: {
    userId: string;
    amount: number | string;
    poolName: string;
    poolId: string;
    profitLabel?: string;
  }): Promise<void> {
    return this.notify({
      templateSlug: "pool_profit_share",
      recipientUserId: input.userId,
      variables: {
        profit: String(input.amount),
        amount: String(input.amount),
        pool_name: input.poolName,
        poolName: input.poolName,
        profitLabel: input.profitLabel ?? "profit",
      },
      relatedEntityType: "fund",
      relatedEntityId: input.poolId,
      channels: ["in_app", "email"],
    });
  },

  investmentUpdated(input: {
    userId: string;
    poolName: string;
    message: string;
    poolId: string;
  }): Promise<void> {
    return this.notify({
      templateSlug: "investment_updated",
      recipientUserId: input.userId,
      variables: { pool_name: input.poolName, review_notes: input.message },
      relatedEntityType: "fund",
      relatedEntityId: input.poolId,
      channels: ["in_app"],
    });
  },

  supportTicketCreated(input: {
    userId: string;
    subject: string;
    ticketId: string;
  }): Promise<void> {
    return this.notify({
      templateSlug: "support_ticket_created",
      recipientUserId: input.userId,
      variables: { support_ticket: input.subject },
      relatedEntityType: "support_ticket",
      relatedEntityId: input.ticketId,
    });
  },

  supportReply(input: {
    userId: string;
    subject: string;
    replyPreview: string;
    ticketId: string;
  }): Promise<void> {
    return this.notify({
      templateSlug: "support_reply",
      recipientUserId: input.userId,
      variables: {
        support_ticket: input.subject,
        reply_preview: input.replyPreview,
      },
      relatedEntityType: "support_ticket",
      relatedEntityId: input.ticketId,
      actionUrl: `/dashboard/support`,
    });
  },

  legacyInApp(input: {
    userId: string;
    templateSlug: string;
    title?: string;
    message?: string;
    notificationType?: string;
    variables?: Record<string, string | number | boolean | null | undefined>;
    metadata?: Record<string, unknown>;
    relatedEntityType?: string;
    relatedEntityId?: string;
    triggeredBy?: string | null;
    channels?: CommunicationChannel[];
    category?: CommunicationCategory;
    priority?: CommunicationPriority;
  }): Promise<void> {
    return this.notify({
      templateSlug: input.templateSlug,
      recipientUserId: input.userId,
      notificationType: input.notificationType,
      variables: {
        ...input.variables,
        announcement_title: input.title,
        announcement_body: input.message,
        announcement_preview: input.message,
        review_notes: input.message,
        application_status: input.title,
      },
      metadata: input.metadata,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      triggeredBy: input.triggeredBy,
      channels: input.channels,
      category: input.category,
      priority: input.priority,
    });
  },
};
