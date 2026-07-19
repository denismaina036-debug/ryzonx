import type { PlatformEvent } from "@/domain/platform-events/types";
import { eventDispatcherService } from "@/services/event-dispatcher.service";
import { notificationQueueService } from "@/services/notification-queue.service";
import { webhookService } from "@/services/webhook.service";

/**
 * Automation engine — reacts to platform events via configurable rules.
 * Business services never call this directly; use eventPublisherService.
 */
export const automationService = {
  async processEvent(event: PlatformEvent): Promise<void> {
    await eventDispatcherService.dispatch(event);
  },

  async processQueues(): Promise<{
    notifications: { processed: number; failed: number };
    webhooks: { delivered: number; failed: number };
  }> {
    const [notifications, webhooks] = await Promise.all([
      notificationQueueService.processPending(50),
      webhookService.processPending(20),
    ]);
    return { notifications, webhooks };
  },
};
