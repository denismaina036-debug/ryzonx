import type {
  CommunicationCategory,
  CommunicationChannel,
} from "@/domain/communication/types";
import { communicationRepository } from "@/services/communication/communication-repository";

/**
 * Preference gate — defaults to enabled when no row exists.
 * Critical + security categories bypass preferences.
 */
export async function isDeliveryAllowed(input: {
  userId: string;
  category: CommunicationCategory;
  channel: CommunicationChannel;
  priority?: "low" | "normal" | "high" | "critical";
}): Promise<boolean> {
  if (input.priority === "critical" || input.category === "security") {
    return true;
  }

  return communicationRepository.isChannelEnabled(
    input.userId,
    input.category,
    input.channel
  );
}
