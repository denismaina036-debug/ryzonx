import { createAdminClient } from "@/lib/supabase/admin";
import { buildReferralLink, normalizeReferralCode, referralCodeForUser } from "@/lib/referrals/referral-code";
import { getAppBaseUrl } from "@/lib/app-url";
import { platformSettingsService } from "@/services/platform-settings.service";
import type { ReferralRewardResult, ReferralSummary } from "@/domain/referrals/types";

type ReferralCodeRow = {
  user_id: string;
  code: string;
  is_active: boolean;
};

type ReferralRow = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  status: string;
  reward_amount: number | string;
};

type FinalizeRewardRow = {
  referral_id: string;
  referrer_id: string;
  reward_amount: number | string;
  reward_transaction_id: string | null;
  rewarded_now: boolean;
};

function toMoney(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function isMissingReferralSchema(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return code === "42P01" || code === "PGRST205" || message.includes("referral_codes");
}

export async function getReferralRewardAmount(): Promise<number> {
  const raw = await platformSettingsService.get("referral_reward_amount");
  if (raw == null) return 5;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? toMoney(parsed) : 5;
}

export const referralService = {
  async ensureCode(userId: string): Promise<string> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("referral_codes")
      .select("user_id, code, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    const existing = data as ReferralCodeRow | null;
    if (existing?.code) return existing.code;

    const code = referralCodeForUser(userId);
    const { error: insertError } = await db.from("referral_codes").upsert(
      { user_id: userId, code, is_active: true } as never,
      { onConflict: "user_id" }
    );
    if (insertError) throw new Error(insertError.message);
    return code;
  },

  async recordSignupAttribution(input: {
    referredUserId: string;
    referralCode?: string | null;
  }): Promise<void> {
    const code = normalizeReferralCode(input.referralCode);
    if (!code) return;

    const db = createAdminClient();
    const { data, error } = await db
      .from("referral_codes")
      .select("user_id, code, is_active")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    const owner = data as ReferralCodeRow | null;
    if (!owner || owner.user_id === input.referredUserId) return;

    const { error: insertError } = await db.from("referrals").insert({
      referrer_id: owner.user_id,
      referred_user_id: input.referredUserId,
      referral_code: owner.code,
      status: "pending",
    } as never);

    // Attribution is immutable. A repeated registration callback must not replace it.
    if (insertError && insertError.code !== "23505") {
      throw new Error(insertError.message);
    }
  },

  async rewardFirstPoolInvestment(input: {
    referredUserId: string;
    qualifyingTransactionId: string;
  }): Promise<ReferralRewardResult | null> {
    const db = createAdminClient();
    const rewardAmount = await getReferralRewardAmount();
    const { data, error } = await db.rpc("finalize_referral_reward", {
      p_referred_user_id: input.referredUserId,
      p_qualifying_transaction_id: input.qualifyingTransactionId,
      p_reward_amount: rewardAmount,
    });

    if (error) throw new Error(error.message);
    const row = ((data ?? []) as FinalizeRewardRow[])[0];
    if (!row) return null;

    return {
      referralId: row.referral_id,
      referrerId: row.referrer_id,
      rewardAmount: toMoney(row.reward_amount),
      rewardTransactionId: row.reward_transaction_id,
      rewardedNow: row.rewarded_now,
    };
  },

  async processPendingRewardForUser(referredUserId: string): Promise<ReferralRewardResult | null> {
    const db = createAdminClient();
    const { data: referral, error: referralError } = await db
      .from("referrals")
      .select("id, status")
      .eq("referred_user_id", referredUserId)
      .in("status", ["pending", "qualified"])
      .maybeSingle();

    if (referralError) throw new Error(referralError.message);
    if (!referral) return null;

    const { data: investment, error: investmentError } = await db
      .from("transactions")
      .select("id")
      .eq("user_id", referredUserId)
      .eq("payment_method", "pool_allocation")
      .in("status", ["pending", "completed"])
      .gt("amount", 0)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (investmentError) throw new Error(investmentError.message);
    if (!investment) return null;

    return this.rewardFirstPoolInvestment({
      referredUserId,
      qualifyingTransactionId: (investment as { id: string }).id,
    });
  },

  async getSummary(userId: string): Promise<ReferralSummary> {
    const db = createAdminClient();
    const fallbackCode = referralCodeForUser(userId);
    const [referralCode, rewardAmount, referralsResult] = await Promise.all([
      this.ensureCode(userId).catch((error) => {
        if (isMissingReferralSchema(error)) return fallbackCode;
        throw error;
      }),
      getReferralRewardAmount().catch(() => 5),
      db
        .from("referrals")
        .select("id, referrer_id, referred_user_id, status, reward_amount")
        .eq("referrer_id", userId),
    ]);

    if (referralsResult.error && isMissingReferralSchema(referralsResult.error)) {
      return {
        referralCode,
        referralLink: buildReferralLink(referralCode, getAppBaseUrl()),
        rewardAmount,
        successfulReferrals: 0,
        pendingReferrals: 0,
        totalReferralRewards: 0,
      };
    }
    if (referralsResult.error) throw new Error(referralsResult.error.message);
    const referrals = (referralsResult.data ?? []) as ReferralRow[];
    const rewarded = referrals.filter((referral) => referral.status === "rewarded");

    return {
      referralCode,
      referralLink: buildReferralLink(referralCode, getAppBaseUrl()),
      rewardAmount,
      successfulReferrals: rewarded.length,
      pendingReferrals: referrals.filter((referral) => referral.status === "pending").length,
      totalReferralRewards: toMoney(
        rewarded.reduce((total, referral) => total + toMoney(referral.reward_amount), 0)
      ),
    };
  },
};
