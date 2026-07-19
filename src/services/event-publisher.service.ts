import type { PublishPlatformEventInput, PlatformEvent } from "@/domain/platform-events/types";
import { platformEventService } from "@/services/platform-event.service";
import { eventDispatcherService } from "@/services/event-dispatcher.service";

/**
 * Single entry point for business services to publish platform events.
 * Never throws — failures are logged only.
 */
export const eventPublisherService = {
  async publish(input: PublishPlatformEventInput): Promise<PlatformEvent | null> {
    try {
      const event = await platformEventService.create(input);
      void eventDispatcherService.dispatch(event).catch((err) => {
        console.error(`[eventPublisher] Dispatch failed for ${event.id}:`, err);
      });
      return event;
    } catch (err) {
      console.error(`[eventPublisher] Failed to publish ${input.eventType}:`, err);
      return null;
    }
  },

  /** Fire-and-forget variant for hot paths */
  publishAsync(input: PublishPlatformEventInput): void {
    void this.publish(input);
  },
};
