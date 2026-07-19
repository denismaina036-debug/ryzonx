import { PLATFORM_EVENT_TYPES } from "@/constants/platform-events";
import type { PlatformEventCategory, PlatformEventSeverity } from "@/constants/platform-events";
import { eventPublisherService } from "@/services/event-publisher.service";

export function publishPlatformEvent(input: {
  eventType: string;
  category?: PlatformEventCategory;
  entityType?: string;
  entityId?: string;
  actorId?: string | null;
  correlationId?: string;
  severity?: PlatformEventSeverity;
  payload?: Record<string, unknown>;
}): void {
  eventPublisherService.publishAsync(input);
}

export { PLATFORM_EVENT_TYPES };
