import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { notificationService } from "@/services/notification.service";
import type {
  ChallengeEnrollment,
  ChallengeEnrollmentStatus,
  TraderChallenge,
} from "@/features/investor/types";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapChallenge(row: {
  id: string;
  title: string;
  description: string;
  price: number | string;
  profit_target_pct: number | string;
  max_daily_loss_pct: number | string | null;
  max_overall_loss_pct: number | string;
  duration_days: number;
  rules_summary: string | null;
  button_text: string;
  is_active: boolean;
}): TraderChallenge {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: toNumber(row.price),
    profitTargetPct: toNumber(row.profit_target_pct),
    maxDailyLossPct: row.max_daily_loss_pct != null ? toNumber(row.max_daily_loss_pct) : null,
    maxOverallLossPct: toNumber(row.max_overall_loss_pct),
    durationDays: row.duration_days,
    rulesSummary: row.rules_summary ?? "",
    buttonText: row.button_text,
    isActive: row.is_active,
  };
}

function mapEnrollment(row: {
  id: string;
  challenge_id: string;
  status: string;
  payment_method: string | null;
  amount_paid: number | string | null;
  challenge_account_details: string | null;
  admin_rules: string | null;
}): ChallengeEnrollment {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    status: row.status as ChallengeEnrollmentStatus,
    paymentMethod:
      row.payment_method === "balance" || row.payment_method === "crypto"
        ? row.payment_method
        : null,
    amountPaid: row.amount_paid != null ? toNumber(row.amount_paid) : null,
    challengeAccountDetails: row.challenge_account_details,
    adminRules: row.admin_rules,
  };
}

export const challengeService = {
  async getActiveChallenge(): Promise<TraderChallenge | null> {
    const supabase = await createClient();
    const { data } = await supabase
      .from("trader_challenges")
      .select("*")
      .eq("fund_id", DEFAULT_FUND_ID)
      .eq("is_active", true)
      .maybeSingle();

    return data ? mapChallenge(data as Parameters<typeof mapChallenge>[0]) : null;
  },

  async getInvestorChallengeState(): Promise<{
    challenge: TraderChallenge | null;
    enrollment: ChallengeEnrollment | null;
    availableBalance: number;
  }> {
    const user = await requireAuth();
    const supabase = await createClient();
    const db = createAdminClient();

    const [challengeResult, enrollmentResult, portfolioResult] = await Promise.all([
      supabase
        .from("trader_challenges")
        .select("*")
        .eq("fund_id", DEFAULT_FUND_ID)
        .eq("is_active", true)
        .maybeSingle(),
      db
        .from("trader_challenge_enrollments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("investor_portfolios")
        .select("available_balance")
        .eq("user_id", user.id)
        .eq("fund_id", DEFAULT_FUND_ID)
        .maybeSingle(),
    ]);

    const challengeRow = challengeResult.data as Parameters<typeof mapChallenge>[0] | null;
    const enrollmentRow = enrollmentResult.data as Parameters<typeof mapEnrollment>[0] | null;

    return {
      challenge: challengeRow ? mapChallenge(challengeRow) : null,
      enrollment: enrollmentRow ? mapEnrollment(enrollmentRow) : null,
      availableBalance: toNumber(
        (portfolioResult.data as { available_balance?: number } | null)?.available_balance
      ),
    };
  },

  async enroll(input: {
    paymentMethod: "balance" | "crypto";
  }): Promise<{ enrollmentId: string; redirectTo?: string }> {
    const user = await requireAuth();
    const db = createAdminClient();

    const { data: challenge } = await db
      .from("trader_challenges")
      .select("*")
      .eq("fund_id", DEFAULT_FUND_ID)
      .eq("is_active", true)
      .maybeSingle();

    if (!challenge) throw new Error("No active challenge available.");

    const challengeRow = challenge as Parameters<typeof mapChallenge>[0];
    const price = toNumber(challengeRow.price);

    const { data: existing } = await db
      .from("trader_challenge_enrollments")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("challenge_id", challengeRow.id)
      .maybeSingle();

    if (existing) {
      const status = (existing as { status: string }).status;
      if (status !== "cancelled" && status !== "pending_payment") {
        throw new Error("You are already enrolled in this challenge.");
      }
    }

    if (input.paymentMethod === "crypto") {
      const { data: enrollment, error } = await db
        .from("trader_challenge_enrollments")
        .upsert(
          {
            user_id: user.id,
            challenge_id: challengeRow.id,
            status: "pending_payment",
            payment_method: "crypto",
            amount_paid: price,
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "user_id,challenge_id" }
        )
        .select("id")
        .single();

      if (error || !enrollment) throw new Error(error?.message ?? "Enrollment failed.");

      return {
        enrollmentId: (enrollment as { id: string }).id,
        redirectTo: `/dashboard/deposits?challenge=${challengeRow.id}&amount=${price}`,
      };
    }

    const { data: portfolio } = await db
      .from("investor_portfolios")
      .select("available_balance")
      .eq("user_id", user.id)
      .eq("fund_id", DEFAULT_FUND_ID)
      .maybeSingle();

    const available = toNumber(
      (portfolio as { available_balance?: number } | null)?.available_balance
    );

    if (available < price) {
      throw new Error(
        `Insufficient balance. You need $${price.toLocaleString()} — deposit first or pay via crypto.`
      );
    }

    await db
      .from("investor_portfolios")
      .update({ available_balance: available - price } as never)
      .eq("user_id", user.id)
      .eq("fund_id", DEFAULT_FUND_ID);

    const { data: enrollment, error } = await db
      .from("trader_challenge_enrollments")
      .upsert(
        {
          user_id: user.id,
          challenge_id: challengeRow.id,
          status: "awaiting_setup",
          payment_method: "balance",
          amount_paid: price,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "user_id,challenge_id" }
      )
      .select("id")
      .single();

    if (error || !enrollment) throw new Error(error?.message ?? "Enrollment failed.");

    await db.from("transactions").insert({
      user_id: user.id,
      fund_id: DEFAULT_FUND_ID,
      type: "adjustment",
      amount: price,
      status: "completed",
      payment_method: "challenge_fee",
      notes: `Trader challenge enrollment — ${challengeRow.title}`,
    } as never);

    await notificationService.sendToUser({
      userId: user.id,
      type: "pool_trading",
      title: "Challenge payment received",
      message:
        "Your challenge fee was paid from your balance. Our team will send your challenge account and rules shortly.",
      metadata: { challenge_id: challengeRow.id },
    });

    const { data: admins } = await db
      .from("profiles")
      .select("id")
      .eq("role", "administrator");

    for (const admin of (admins ?? []) as Array<{ id: string }>) {
      await notificationService.sendToUser({
        userId: admin.id,
        type: "admin_message",
        title: "New challenge enrollment",
        message: `${user.fullName} paid for ${challengeRow.title}. Send challenge account credentials.`,
        metadata: { user_id: user.id, challenge_id: challengeRow.id },
      });
    }

    return { enrollmentId: (enrollment as { id: string }).id };
  },

  async completeCryptoPayment(challengeId: string): Promise<void> {
    const user = await requireAuth();
    const db = createAdminClient();

    const { data: enrollment } = await db
      .from("trader_challenge_enrollments")
      .select("id, status, payment_method")
      .eq("user_id", user.id)
      .eq("challenge_id", challengeId)
      .maybeSingle();

    if (!enrollment) return;

    const row = enrollment as { id: string; status: string; payment_method: string | null };
    if (row.payment_method !== "crypto" || row.status !== "pending_payment") return;

    await db
      .from("trader_challenge_enrollments")
      .update({
        status: "awaiting_setup",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id);

    await notificationService.sendToUser({
      userId: user.id,
      type: "pool_trading",
      title: "Challenge deposit received",
      message:
        "Your crypto deposit for the challenge is recorded. Our team will send your challenge account and rules after confirmation.",
      metadata: { challenge_id: challengeId },
    });
  },

  async getAdminEnrollments(): Promise<
    Array<
      ChallengeEnrollment & {
        investorName: string;
        investorEmail: string;
        challengeTitle: string;
      }
    >
  > {
    await requireRole("administrator");
    const db = createAdminClient();

    const { data, error } = await db
      .from("trader_challenge_enrollments")
      .select("*, profiles!trader_challenge_enrollments_user_id_fkey(full_name, email), trader_challenges(title)")
      .in("status", ["awaiting_setup", "paid", "active"])
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const profiles = row.profiles as { full_name: string; email: string } | null;
      const challenge = row.trader_challenges as { title: string } | null;
      const base = mapEnrollment(row as Parameters<typeof mapEnrollment>[0]);
      return {
        ...base,
        investorName: profiles?.full_name ?? "Unknown",
        investorEmail: profiles?.email ?? "",
        challengeTitle: challenge?.title ?? "Challenge",
      };
    });
  },

  async setupEnrollment(
    enrollmentId: string,
    input: { accountDetails: string; rules: string }
  ): Promise<void> {
    await requireRole("administrator");
    const db = createAdminClient();

    const { data: enrollment, error } = await db
      .from("trader_challenge_enrollments")
      .update({
        status: "active",
        challenge_account_details: input.accountDetails.trim(),
        admin_rules: input.rules.trim(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", enrollmentId)
      .select("user_id, challenge_id")
      .single();

    if (error || !enrollment) throw new Error(error?.message ?? "Update failed.");

    const row = enrollment as { user_id: string; challenge_id: string };

    await notificationService.sendToUser({
      userId: row.user_id,
      type: "admin_message",
      title: "Your challenge account is ready",
      message:
        "Your trader challenge credentials and rules have been sent. Open the challenge page to view them.",
      metadata: { challenge_id: row.challenge_id, enrollment_id: enrollmentId },
    });
  },

  async updateTradeScreenshot(tradeId: string, screenshotUrl: string): Promise<void> {
    await requireRole("administrator");
    const db = createAdminClient();

    const { error } = await db
      .from("trades")
      .update({ chart_screenshot_url: screenshotUrl.trim() || null } as never)
      .eq("id", tradeId);

    if (error) throw new Error(error.message);
  },
};
