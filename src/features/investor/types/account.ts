export interface ReturnTier {
  minAmount: number;
  maxAmount: number | null;
  returnPct: number;
}

export interface PoolReturnTier extends ReturnTier {
  label: string;
}

export interface InvestorNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  body: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  investorName?: string;
  investorEmail?: string;
}

export interface InvestorSettingsData {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  accountStatus: string;
  showActivityPublicly: boolean;
  createdAt: string;
  updatedAt: string;
}
