import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/session";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { insertTransactionWithReference } from "@/lib/transaction/insert";
import { communicationTriggers } from "@/services/communication";
import { formatMoney } from "@/services/communication/user-variables";
import { megaPayService } from "@/services/megapay.service";
import { paymentProviderConfigService } from "@/services/payment-provider-config.service";
import { platformSettingsService } from "@/services/platform-settings.service";
import { maskPhone, normalizeKenyanPhone } from "@/lib/mobile-payments/mpesa";
import type {
  MobilePaymentConfig,
  MobilePaymentIntentResponse,
  MobilePaymentStatusResponse,
} from "@/features/investor/types/mobile-payment";

type IntentRow = {
  id: string;
  user_id: string;
  transaction_id: string;
  status: MobilePaymentStatusResponse["status"];
  reference: string;
  phone_e164: string;
  usd_amount: string | number;
  kes_amount: string | number;
  kes_per_usd: string | number;
  provider_request_id: string | null;
  provider_receipt: string | null;
  response_description: string | null;
};

type MegaPayVerifiedStatus = Awaited<ReturnType<typeof megaPayService.status>>;

function dbClient(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

function numberValue(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

async function paymentConfig(): Promise<MobilePaymentConfig> {
  const stored = await paymentProviderConfigService.getRuntimeConfig();
  const minimumDepositUsd = await platformSettingsService.getDepositMinimum("mpesa");
  const rate = stored.kesPerUsd;
  const enabled = stored.enabled;
  return {
    enabled,
    providerConfigured: enabled && await megaPayService.isConfigured() && rate !== null,
    kesPerUsd: rate,
    minimumDepositUsd,
    methods: [
      { id: "mpesa", name: "M-Pesa", active: enabled, description: "Secure STK push to your phone" },
      { id: "airtel_money", name: "Airtel Money", active: false, description: "Coming soon" },
    ],
  };
}

function publicIntent(row: IntentRow, message = "Check your phone for the M-Pesa prompt."): MobilePaymentIntentResponse {
  return {
    id: row.id,
    status: row.status,
    reference: row.reference,
    usdAmount: numberValue(row.usd_amount),
    kesAmount: numberValue(row.kes_amount),
    phone: maskPhone(row.phone_e164),
    message,
  };
}

function publicStatus(row: IntentRow): MobilePaymentStatusResponse {
  return {
    id: row.id,
    status: row.status,
    reference: row.reference,
    usdAmount: numberValue(row.usd_amount),
    kesAmount: numberValue(row.kes_amount),
    responseDescription: row.response_description,
    receipt: row.provider_receipt,
  };
}

async function markFailed(intent: IntentRow, description: string, code?: string) {
  const db = dbClient();
  await db.from("mobile_payment_intents").update({
    status: "failed",
    response_code: code ?? null,
    response_description: description,
  }).eq("id", intent.id).neq("status", "completed");
  await db.from("transactions").update({ status: "cancelled", notes: `M-Pesa payment failed — ${description}` })
    .eq("id", intent.transaction_id).eq("status", "pending");
}

async function settleVerified(intent: IntentRow, verified: MegaPayVerifiedStatus): Promise<boolean> {
  const resultCode = String(verified.ResultCode);
  const transactionCode = verified.TransactionCode == null ? "" : String(verified.TransactionCode);
  const completed = verified.TransactionStatus.toLowerCase() === "completed";
  const successful = resultCode === "200" && completed && (transactionCode === "0" || transactionCode === "");

  if (!successful) {
    const terminal = completed || (transactionCode !== "" && transactionCode !== "0");
    if (terminal) await markFailed(intent, verified.ResultDesc || "M-Pesa payment was not completed.", transactionCode || resultCode);
    return false;
  }

  if (verified.TransactionReference !== intent.reference) {
    throw new Error("MegaPay verification reference did not match the Ryvonx payment.");
  }
  if (Math.abs(verified.TransactionAmount - numberValue(intent.kes_amount)) > 0.001) {
    throw new Error("MegaPay verification amount did not match the locked KES amount.");
  }
  if (normalizeKenyanPhone(verified.Msisdn) !== intent.phone_e164) {
    throw new Error("MegaPay verification phone did not match the payment intent.");
  }
  if (!verified.TransactionReceipt) {
    throw new Error("MegaPay completed the payment without returning an M-Pesa receipt.");
  }

  const db = dbClient();
  const { data, error } = await db.rpc("settle_mobile_payment", {
    p_intent_id: intent.id,
    p_provider_transaction_id: verified.TransactionID,
    p_provider_receipt: verified.TransactionReceipt,
    p_response_code: transactionCode || resultCode,
    p_response_description: verified.ResultDesc,
    p_provider_payload: verified,
  });
  if (error) throw new Error(error.message);

  const settledNow = data === true;
  if (settledNow) {
    await communicationTriggers.depositApproved({
      userId: intent.user_id,
      amount: formatMoney(numberValue(intent.usd_amount)),
      transactionId: intent.transaction_id,
      triggeredBy: intent.user_id,
    });
  }
  return settledNow;
}

async function loadIntentById(id: string): Promise<IntentRow | null> {
  const { data, error } = await dbClient().from("mobile_payment_intents").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as IntentRow | null;
}

export const mobilePaymentService = {
  getConfig: paymentConfig,

  async initiate(input: { amountUsd: number; phone: string }): Promise<MobilePaymentIntentResponse> {
    const user = await requireAuth();
    const config = await paymentConfig();
    if (!config.enabled) throw new Error("Mobile payments are currently unavailable.");
    if (!config.providerConfigured || !config.kesPerUsd) {
      throw new Error("M-Pesa is awaiting merchant configuration.");
    }

    const phone = normalizeKenyanPhone(input.phone);
    const amountUsd = Math.round(input.amountUsd * 100) / 100;
    const amountKes = Math.round(amountUsd * config.kesPerUsd);
    const db = dbClient();

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count } = await db.from("mobile_payment_intents").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", oneMinuteAgo);
    if ((count ?? 0) >= 3) throw new Error("Too many payment attempts. Wait one minute and try again.");

    const minimumUsd = config.minimumDepositUsd;
    if (amountUsd < minimumUsd) throw new Error(`Minimum deposit is ${formatMoney(minimumUsd)}.`);

    const reference = `RVX-MP-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const notes = `M-Pesa deposit initiated — KES ${amountKes.toFixed(2)} · USD ${amountUsd.toFixed(2)}`;
    const transaction = await insertTransactionWithReference(db, {
      user_id: user.id,
      fund_id: DEFAULT_FUND_ID,
      type: "deposit",
      amount: amountUsd,
      status: "pending",
      payment_method: "mpesa",
      reference,
      notes,
      metadata: { provider: "megapay", mobilePaymentReference: reference, kesAmount: amountKes, kesPerUsd: config.kesPerUsd },
    });

    const { data: created, error: createError } = await db.from("mobile_payment_intents").insert({
      user_id: user.id,
      transaction_id: transaction.id,
      provider: "megapay",
      payment_method: "mpesa",
      status: "initiating",
      reference,
      phone_e164: phone,
      usd_amount: amountUsd,
      kes_amount: amountKes,
      kes_per_usd: config.kesPerUsd,
    }).select("*").single();
    if (createError || !created) {
      await db.from("transactions").update({ status: "cancelled" }).eq("id", transaction.id);
      throw new Error(createError?.message ?? "Could not create the M-Pesa payment.");
    }

    const intent = created as IntentRow;
    try {
      const response = await megaPayService.initiate({ amountKes, phone, reference });
      const { data: updated, error: updateError } = await db.from("mobile_payment_intents").update({
        status: "prompt_sent",
        provider_request_id: response.transaction_request_id,
        response_code: response.success == null ? null : String(response.success),
        response_description: response.message ?? response.massage ?? "STK prompt sent.",
        initiated_at: new Date().toISOString(),
        metadata: { initiationResponse: response },
      }).eq("id", intent.id).select("*").single();
      if (updateError || !updated) throw new Error(updateError?.message ?? "Could not save MegaPay response.");
      return publicIntent(updated as IntentRow, response.message ?? response.massage ?? "Check your phone for the M-Pesa prompt.");
    } catch (error) {
      await markFailed(intent, error instanceof Error ? error.message : "MegaPay initiation failed.");
      throw error;
    }
  },

  async getForUser(id: string, refreshProvider = false): Promise<MobilePaymentStatusResponse> {
    const user = await requireAuth();
    let intent = await loadIntentById(id);
    if (!intent || intent.user_id !== user.id) throw new Error("Payment not found.");

    if (refreshProvider && ["prompt_sent", "processing"].includes(intent.status) && intent.provider_request_id) {
      const verified = await megaPayService.status(intent.provider_request_id);
      await settleVerified(intent, verified);
      intent = (await loadIntentById(id)) ?? intent;
    }
    return publicStatus(intent);
  },

  async processMegaPayWebhook(payload: Record<string, unknown>): Promise<{ duplicate: boolean; settled: boolean }> {
    const reference = String(payload.TransactionReference ?? "");
    const eventKey = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const db = dbClient();
    const { data: intentData, error: intentError } = await db.from("mobile_payment_intents")
      .select("*").eq("reference", reference).maybeSingle();
    if (intentError) throw new Error(intentError.message);
    const intent = intentData as IntentRow | null;

    const { data: event, error: eventError } = await db.from("mobile_payment_webhook_events").insert({
      provider: "megapay",
      event_key: eventKey,
      intent_id: intent?.id ?? null,
      payload,
      processing_status: intent ? "received" : "ignored",
    }).select("id").single();
    if (eventError?.code === "23505") return { duplicate: true, settled: false };
    if (eventError || !event) throw new Error(eventError?.message ?? "Could not record webhook event.");
    if (!intent || !intent.provider_request_id) return { duplicate: false, settled: false };

    try {
      await db.from("mobile_payment_intents").update({ status: "processing" }).eq("id", intent.id)
        .in("status", ["prompt_sent", "initiating"]);
      const verified = await megaPayService.status(intent.provider_request_id);
      const settled = await settleVerified({ ...intent, status: intent.status === "completed" ? "completed" : "processing" }, verified);
      await db.from("mobile_payment_webhook_events").update({
        processing_status: "processed",
        processed_at: new Date().toISOString(),
      }).eq("id", (event as { id: string }).id);
      return { duplicate: false, settled };
    } catch (error) {
      await db.from("mobile_payment_webhook_events").update({
        processing_status: "failed",
        processing_error: error instanceof Error ? error.message.slice(0, 500) : "Processing failed",
        processed_at: new Date().toISOString(),
      }).eq("id", (event as { id: string }).id);
      throw error;
    }
  },
};
