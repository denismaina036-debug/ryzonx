import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditService } from "@/services/audit.service";

type WithdrawalHold = {
  investor_id: string;
  is_withdrawal_allowed: boolean;
  corrected_at: string;
  released_at: string | null;
  released_by: string | null;
};

export const adminInvestorCorrectionService = {
  async findByEmail(email: string) {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data: profile, error } = await db.from("profiles").select("id, full_name, email").ilike("email", email.trim()).maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) return null;
    const [deposits, allocations, withdrawalHold] = await Promise.all([
      db.from("transactions").select("id, amount, status, reference, created_at").eq("user_id", profile.id).eq("type", "deposit").order("created_at", { ascending: false }),
      db.from("investment_allocations").select("id, amount, status, investment_cycle_id, investment_cycles!inner(fund_id, funds!inner(name))").eq("investor_id", profile.id).order("created_at", { ascending: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- migration 00072 is live; generated types are pending.
      (db as any).from("investor_correction_withdrawal_holds").select("investor_id, is_withdrawal_allowed, corrected_at, released_at, released_by").eq("investor_id", profile.id).maybeSingle(),
    ]);
    if (deposits.error) throw new Error(deposits.error.message);
    if (allocations.error) throw new Error(allocations.error.message);
    if (withdrawalHold.error) throw new Error(withdrawalHold.error.message);
    return {
      profile,
      deposits: deposits.data ?? [],
      allocations: allocations.data ?? [],
      withdrawalHold: (withdrawalHold.data as WithdrawalHold | null) ?? null,
    };
  },
  async correct(input: { kind: "deposit" | "investment"; id: string; amount: number; reason: string; actorId: string }) {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Amount must be greater than zero.");
    const db = createAdminClient();
    const rpc = input.kind === "deposit" ? "admin_correct_investor_deposit" : "admin_correct_investment_allocation";
    const { error } = await db.rpc(rpc as never, {
      [input.kind === "deposit" ? "p_transaction_id" : "p_allocation_id"]: input.id,
      p_amount: input.amount,
      p_reason: input.reason,
      p_actor_id: input.actorId,
    } as never);
    if (error) throw new Error(error.message);
    const target = input.kind === "deposit"
      ? await db.from("transactions").select("user_id").eq("id", input.id).single()
      : await db.from("investment_allocations").select("investor_id").eq("id", input.id).single();
    const investorId = (target.data as { user_id?: string; investor_id?: string } | null)?.user_id ?? (target.data as { investor_id?: string } | null)?.investor_id;
    if (investorId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- migration 00072 is live; generated types are pending.
      const { error: holdError } = await (db as any)
        .from("investor_correction_withdrawal_holds")
        .upsert({ investor_id: investorId, is_withdrawal_allowed: false, corrected_at: new Date().toISOString(), released_at: null, released_by: null });
      if (holdError) throw new Error(holdError.message);
    }
  },

  async allowWithdrawals(investorId: string, actorId: string): Promise<WithdrawalHold> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: investor, error: investorError } = await db
      .from("profiles")
      .select("id")
      .eq("id", investorId)
      .maybeSingle();
    if (investorError) throw new Error(investorError.message);
    if (!investor) throw new Error("Investor not found.");

    const releasedAt = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- migration 00072 is live; generated types are pending.
    const { data, error } = await (db as any)
      .from("investor_correction_withdrawal_holds")
      .upsert(
        {
          investor_id: investorId,
          is_withdrawal_allowed: true,
          released_at: releasedAt,
          released_by: actorId,
        },
        { onConflict: "investor_id" }
      )
      .select("investor_id, is_withdrawal_allowed, corrected_at, released_at, released_by")
      .single();

    if (error) throw new Error(error.message);
    const released = data as WithdrawalHold | null;
    if (!released?.is_withdrawal_allowed || !released.released_at) {
      throw new Error("Withdrawal permission was not saved. Please try again.");
    }

    await auditService.log({
      actorId,
      action: "investor_correction_withdrawal_released",
      entityType: "investor",
      entityId: investorId,
      newValues: {
        isWithdrawalAllowed: true,
        releasedAt: released.released_at,
      },
    });

    return released;
  },
};
