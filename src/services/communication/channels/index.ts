import { inAppChannel } from "./in-app.channel";
import { emailChannel } from "./email.channel";
import type { CommunicationChannelAdapter } from "./types";

const adapters: CommunicationChannelAdapter[] = [inAppChannel, emailChannel];

export function getChannelAdapter(
  channel: string
): CommunicationChannelAdapter | undefined {
  return adapters.find((a) => a.channel === channel);
}

export { inAppChannel, emailChannel };
