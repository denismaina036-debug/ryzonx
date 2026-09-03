export type MobilePaymentMethod = "mpesa";
export type MobilePaymentStatus =
  | "created"
  | "initiating"
  | "prompt_sent"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export interface MobilePaymentConfig {
  enabled: boolean;
  providerConfigured: boolean;
  kesPerUsd: number | null;
  minimumDepositUsd: number;
  methods: Array<{
    id: "mpesa" | "airtel_money";
    name: string;
    active: boolean;
    description: string;
  }>;
}

export interface MobilePaymentIntentResponse {
  id: string;
  status: MobilePaymentStatus;
  reference: string;
  usdAmount: number;
  kesAmount: number;
  phone: string;
  message: string;
}

export interface MobilePaymentStatusResponse {
  id: string;
  status: MobilePaymentStatus;
  reference: string;
  usdAmount: number;
  kesAmount: number;
  responseDescription: string | null;
  receipt: string | null;
}
