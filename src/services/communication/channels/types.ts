import type {
  CommunicationCategory,
  CommunicationChannel,
  CommunicationPriority,
  CommunicationStatus,
  RenderedCommunication,
} from "@/domain/communication/types";

export interface ChannelDispatchContext {
  communicationId: string;
  deliveryId: string;
  recipientUserId: string;
  recipientEmail: string | null;
  rendered: RenderedCommunication;
  notificationType: string;
  metadata?: Record<string, unknown>;
  category?: CommunicationCategory;
  priority?: CommunicationPriority;
}

export interface ChannelDispatchResult {
  status: CommunicationStatus;
  notificationId?: string;
  externalId?: string;
  error?: string;
}

export interface CommunicationChannelAdapter {
  channel: CommunicationChannel;
  dispatch(ctx: ChannelDispatchContext): Promise<ChannelDispatchResult>;
}
