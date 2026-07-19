import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import type { AutomationCenterView, EventExplorerFilters } from "@/domain/platform-events/types";
import { platformEventService } from "@/services/platform-event.service";
import { notificationQueueService } from "@/services/notification-queue.service";
import { webhookService } from "@/services/webhook.service";
import { eventDispatcherService } from "@/services/event-dispatcher.service";

export const eventExplorerService = {
  async explore(filters: EventExplorerFilters = {}) {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    return platformEventService.listFiltered(filters);
  },

  async getAutomationCenterView(): Promise<AutomationCenterView> {
    await requireRole(USER_ROLES.ADMINISTRATOR);

    const [
      recentEvents,
      queueItems,
      failedDeliveries,
      rules,
      notificationCounts,
      pendingWebhooks,
    ] = await Promise.all([
      platformEventService.listRecent(30),
      notificationQueueService.listPending(20),
      webhookService.listFailedDeliveries(10),
      eventDispatcherService.listRules(),
      notificationQueueService.countByStatus(),
      webhookService.countPending(),
    ]);

    return {
      recentEvents,
      pendingNotifications: notificationCounts.pending,
      failedNotifications: notificationCounts.failed,
      pendingWebhooks,
      failedWebhooks: failedDeliveries.length,
      activeRules: rules.filter((r) => r.status === "active").length,
      queueItems,
      failedDeliveries,
      rules,
    };
  },
};
