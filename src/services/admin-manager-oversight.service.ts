import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { strategyService } from "@/services/strategy.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";
import { adminNotesService } from "@/services/admin-notes.service";
import { auditService } from "@/services/audit.service";
import type { InvestmentCycle, Strategy } from "@/domain/investment/types";
import type { ManagerDevelopmentProfile } from "@/domain/capital-allocation/types";
import type { AuditLogEntry } from "@/features/admin/types";
import type { AdminInternalNote } from "@/services/admin-notes.service";

export interface ManagerOversightProfile {
  managerId: string;
  displayName: string;
  slug: string | null;
  status: string;
  managerLevel: string;
  governanceStage: string;
  development: ManagerDevelopmentProfile;
  strategies: Strategy[];
  cycles: InvestmentCycle[];
  totalAum: number;
  totalInvestors: number;
  notes: AdminInternalNote[];
  recentActivity: AuditLogEntry[];
}

export const adminManagerOversightService = {
  async getProfile(managerId: string): Promise<ManagerOversightProfile> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: manager } = await db
      .from("pool_managers")
      .select("id, display_name, slug, status, manager_level, governance_stage")
      .eq("id", managerId)
      .maybeSingle();

    if (!manager) throw new Error("Manager not found.");
    const mgr = manager as Record<string, unknown>;

    const [development, strategies, cycles, notes, recentActivity] = await Promise.all([
      poolManagerGrowthService.getDevelopmentProfile(managerId),
      strategyService.listAll().then((items) =>
        items.filter((s) => s.poolManagerId === managerId)
      ),
      investmentCycleService.listAll().then((items) =>
        items.filter((c) => c.poolManagerId === managerId)
      ),
      adminNotesService.listNotes("pool_manager", managerId),
      auditService.listByEntity("pool_manager", managerId, 25),
    ]);

    const totalAum = development.pools.reduce((sum, p) => sum + p.totalAum, 0);
    const totalInvestors = cycles.reduce((sum, c) => sum + c.investorCount, 0);

    return {
      managerId,
      displayName: mgr.display_name as string,
      slug: (mgr.slug as string | null) ?? null,
      status: (mgr.status as string) ?? "pending",
      managerLevel: (mgr.manager_level as string) ?? "verified_pool_manager",
      governanceStage: (mgr.governance_stage as string) ?? "active",
      development,
      strategies,
      cycles,
      totalAum,
      totalInvestors,
      notes,
      recentActivity,
    };
  },
};
