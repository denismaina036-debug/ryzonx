import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorization";
import { auditService } from "@/services/audit.service";

export interface PoolManagerReview {
  id: string;
  investorId: string;
  investorName: string;
  poolManagerId: string;
  investmentCycleId: string;
  rating: number;
  message: string;
  createdAt: string;
}

export interface PoolManagerReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
  recentReviews: PoolManagerReview[];
}

export const poolManagerReviewService = {
  async submit(input: {
    poolManagerId: string;
    investmentCycleId: string;
    investmentAllocationId: string;
    rating: number;
    message: string;
  }): Promise<PoolManagerReview> {
    const user = await requirePermission("SUBMIT_REVIEW");
    if (input.rating < 1 || input.rating > 5) throw new Error("Rating must be 1–5.");
    if (!input.message.trim()) throw new Error("Review message is required.");

    const db = createAdminClient();

    const { data: allocation } = await db
      .from("investment_allocations")
      .select("id, investor_id, investment_cycle_id, status")
      .eq("id", input.investmentAllocationId)
      .maybeSingle();

    if (!allocation) throw new Error("Participation not found.");
    const alloc = allocation as {
      investor_id: string;
      investment_cycle_id: string;
      status: string;
    };

    if (alloc.investor_id !== user.id) throw new Error("Insufficient permissions.");
    if (alloc.investment_cycle_id !== input.investmentCycleId) {
      throw new Error("Cycle mismatch.");
    }

    const { data: cycle } = await db
      .from("investment_cycles")
      .select("status, pool_manager_id")
      .eq("id", input.investmentCycleId)
      .maybeSingle();

    if (!cycle) throw new Error("Cycle not found.");
    const cycleRow = cycle as { status: string; pool_manager_id: string };
    if (cycleRow.status !== "completed") {
      throw new Error("Reviews are allowed only after a completed investment cycle.");
    }
    if (cycleRow.pool_manager_id !== input.poolManagerId) {
      throw new Error("Pool manager mismatch.");
    }

    const { data: existing } = await db
      .from("pool_manager_reviews")
      .select("id")
      .eq("investment_allocation_id", input.investmentAllocationId)
      .maybeSingle();
    if (existing) throw new Error("You have already reviewed this participation.");

    const { data, error } = await db
      .from("pool_manager_reviews")
      .insert({
        investor_id: user.id,
        pool_manager_id: input.poolManagerId,
        investment_cycle_id: input.investmentCycleId,
        investment_allocation_id: input.investmentAllocationId,
        rating: input.rating,
        message: input.message.trim(),
        status: "published",
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const row = data as {
      id: string;
      investor_id: string;
      pool_manager_id: string;
      investment_cycle_id: string;
      rating: number;
      message: string;
      created_at: string;
    };

    await auditService.log({
      actorId: user.id,
      action: "pool_manager_review_submitted",
      entityType: "pool_manager_review",
      entityId: row.id,
      newValues: { rating: row.rating, poolManagerId: row.pool_manager_id },
    });

    return {
      id: row.id,
      investorId: row.investor_id,
      investorName: user.fullName ?? user.email,
      poolManagerId: row.pool_manager_id,
      investmentCycleId: row.investment_cycle_id,
      rating: row.rating,
      message: row.message,
      createdAt: row.created_at,
    };
  },

  async getSummary(poolManagerId: string): Promise<PoolManagerReviewSummary> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("pool_manager_reviews")
      .select("id, investor_id, pool_manager_id, investment_cycle_id, rating, message, created_at")
      .eq("pool_manager_id", poolManagerId)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{
      id: string;
      investor_id: string;
      pool_manager_id: string;
      investment_cycle_id: string;
      rating: number;
      message: string;
      created_at: string;
    }>;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const row of rows) {
      distribution[row.rating] = (distribution[row.rating] ?? 0) + 1;
      sum += row.rating;
    }

    const investorIds = [...new Set(rows.map((r) => r.investor_id))];
    const nameMap = new Map<string, string>();
    if (investorIds.length > 0) {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, full_name, email")
        .in("id", investorIds);
      for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null; email: string }>) {
        nameMap.set(p.id, p.full_name?.trim() || p.email);
      }
    }

    return {
      averageRating: rows.length > 0 ? Math.round((sum / rows.length) * 10) / 10 : 0,
      totalReviews: rows.length,
      distribution,
      recentReviews: rows.slice(0, 20).map((row) => ({
        id: row.id,
        investorId: row.investor_id,
        investorName: nameMap.get(row.investor_id) ?? "Investor",
        poolManagerId: row.pool_manager_id,
        investmentCycleId: row.investment_cycle_id,
        rating: row.rating,
        message: row.message,
        createdAt: row.created_at,
      })),
    };
  },

  async remove(reviewId: string, actorId: string): Promise<void> {
    await requirePermission("MODERATE_REVIEWS");
    const db = createAdminClient();
    const { error } = await db
      .from("pool_manager_reviews")
      .update({ status: "removed" } as never)
      .eq("id", reviewId);
    if (error) throw new Error(error.message);

    await auditService.log({
      actorId,
      action: "pool_manager_review_removed",
      entityType: "pool_manager_review",
      entityId: reviewId,
    });
  },
};
