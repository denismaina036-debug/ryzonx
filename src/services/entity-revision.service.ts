import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorization";
import { auditService } from "@/services/audit.service";
import { poolGovernanceLockService } from "@/services/pool-governance-lock.service";
import type { ManagedPoolFormInput } from "@/domain/pools/managed-pool";
import type { UpdateStrategyInput } from "@/domain/investment/types";

export const entityRevisionService = {
  /**
   * Pool Manager submits pool config changes after approval.
   * Approved version stays active until admin approves the revision.
   */
  async submitPoolRevision(poolId: string, draft: ManagedPoolFormInput): Promise<void> {
    await requirePermission("EDIT_OWN_POOL_DRAFT");
    await poolGovernanceLockService.assertPoolEditable(poolId);

    const db = createAdminClient();
    const { data } = await db
      .from("funds")
      .select("lifecycle_status, pool_manager_id, pool_config_version")
      .eq("id", poolId)
      .single();

    if (!data) throw new Error("Pool not found.");
    const row = data as {
      lifecycle_status: string;
      pool_manager_id: string;
      pool_config_version: number;
    };

    if (!["live", "approved"].includes(row.lifecycle_status)) {
      throw new Error("Revisions are only available for approved pools.");
    }

    const { error } = await db
      .from("funds")
      .update({
        pending_revision: draft as never,
        revision_status: "pending_review",
      } as never)
      .eq("id", poolId);

    if (error) throw new Error(error.message);

    await auditService.log({
      actorId: row.pool_manager_id,
      action: "pool_revision_submitted",
      entityType: "fund",
      entityId: poolId,
      newValues: { revisionStatus: "pending_review", poolConfigVersion: row.pool_config_version },
    });
  },

  async approvePoolRevision(poolId: string, actorId: string): Promise<void> {
    await requirePermission("APPROVE_POOLS");
    const db = createAdminClient();

    const { data } = await db
      .from("funds")
      .select("pending_revision, pool_config_version, pool_faq")
      .eq("id", poolId)
      .single();

    if (!data) throw new Error("Pool not found.");
    const row = data as {
      pending_revision: ManagedPoolFormInput | null;
      pool_config_version: number;
      pool_faq: unknown;
    };

    if (!row.pending_revision || row.pending_revision === null) {
      throw new Error("No pending revision to approve.");
    }

    const { managedPoolService } = await import("@/services/managed-pool.service");
    // Apply via internal update — revision payload is the full form
    await managedPoolService.applyApprovedRevision(poolId, row.pending_revision);

    await db
      .from("funds")
      .update({
        pending_revision: null,
        revision_status: "none",
        pool_config_version: row.pool_config_version + 1,
      } as never)
      .eq("id", poolId);

    await auditService.log({
      actorId,
      action: "pool_revision_approved",
      entityType: "fund",
      entityId: poolId,
      newValues: { poolConfigVersion: row.pool_config_version + 1 },
    });
  },

  async rejectPoolRevision(poolId: string, actorId: string, note?: string): Promise<void> {
    await requirePermission("REJECT_POOLS");
    const db = createAdminClient();
    const { error } = await db
      .from("funds")
      .update({ revision_status: "requires_changes" } as never)
      .eq("id", poolId);
    if (error) throw new Error(error.message);

    await auditService.log({
      actorId,
      action: "pool_revision_rejected",
      entityType: "fund",
      entityId: poolId,
      newValues: { note },
    });
  },

  async submitStrategyRevision(strategyId: string, patch: UpdateStrategyInput): Promise<void> {
    await requirePermission("EDIT_OWN_STRATEGY");

    const locked = await poolGovernanceLockService.isStrategyLockedByActiveCycle(strategyId);
    if (locked) {
      throw new Error(
        "Strategy cannot be revised while used by an active investment cycle."
      );
    }

    const db = createAdminClient();
    const { data } = await db
      .from("strategies")
      .select("status, pool_manager_id")
      .eq("id", strategyId)
      .single();

    if (!data) throw new Error("Strategy not found.");
    const row = data as { status: string; pool_manager_id: string };

    if (!["approved", "available", "operating", "paused"].includes(row.status)) {
      throw new Error("Revisions are only available for approved strategies.");
    }

    const { error } = await db
      .from("strategies")
      .update({
        pending_revision: patch as never,
        revision_status: "pending_review",
      } as never)
      .eq("id", strategyId);

    if (error) throw new Error(error.message);

    await auditService.log({
      actorId: row.pool_manager_id,
      action: "strategy_revision_submitted",
      entityType: "strategy",
      entityId: strategyId,
      newValues: { revisionStatus: "pending_review" },
    });
  },

  async approveStrategyRevision(strategyId: string, actorId: string): Promise<void> {
    await requirePermission("APPROVE_STRATEGIES");
    const db = createAdminClient();

    const { data } = await db
      .from("strategies")
      .select("pending_revision, status")
      .eq("id", strategyId)
      .single();

    if (!data) throw new Error("Strategy not found.");
    const row = data as { pending_revision: UpdateStrategyInput | null; status: string };
    if (!row.pending_revision) throw new Error("No pending revision.");

    const patch = row.pending_revision;
    const updatePayload: Record<string, unknown> = {};
    if (patch.name !== undefined) updatePayload.name = patch.name.trim();
    if (patch.description !== undefined) updatePayload.description = patch.description;
    if (patch.objectives !== undefined) updatePayload.objectives = patch.objectives;
    if (patch.riskProfile !== undefined) updatePayload.risk_profile = patch.riskProfile;
    if (patch.investmentStyle !== undefined) updatePayload.investment_style = patch.investmentStyle;
    if (patch.supportedAssets !== undefined) updatePayload.supported_assets = patch.supportedAssets;
    if (patch.visibility !== undefined) updatePayload.visibility = patch.visibility;

    await db
      .from("strategies")
      .update({
        ...updatePayload,
        pending_revision: null,
        revision_status: "none",
      } as never)
      .eq("id", strategyId);

    await auditService.log({
      actorId,
      action: "strategy_revision_approved",
      entityType: "strategy",
      entityId: strategyId,
      newValues: updatePayload,
    });
  },
};
