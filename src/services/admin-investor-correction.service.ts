import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export const adminInvestorCorrectionService = {
  async findByEmail(email: string) {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data: profile, error } = await db.from("profiles").select("id, full_name, email").ilike("email", email.trim()).maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) return null;
    const [deposits, allocations] = await Promise.all([
      db.from("transactions").select("id, amount, status, reference, created_at").eq("user_id", profile.id).eq("type", "deposit").order("created_at", { ascending: false }),
      db.from("investment_allocations").select("id, amount, status, investment_cycle_id, investment_cycles!inner(fund_id, funds!inner(name))").eq("investor_id", profile.id).order("created_at", { ascending: false }),
    ]);
    if (deposits.error) throw new Error(deposits.error.message);
    if (allocations.error) throw new Error(allocations.error.message);
    return { profile, deposits: deposits.data ?? [], allocations: allocations.data ?? [] };
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
    if (investorId) await (db as any).from("investor_correction_withdrawal_holds").upsert({ investor_id: investorId, is_withdrawal_allowed: false, corrected_at: new Date().toISOString(), released_at: null, released_by: null });
  },
};
