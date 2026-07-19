import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { auditService } from "@/services/audit.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { tradingJournalService } from "@/services/trading-journal.service";
import { tradeEntryService } from "@/services/trade-entry.service";
import { tradeSnapshotService } from "@/services/trade-snapshot.service";
import { cycleProgressService } from "@/services/cycle-progress.service";
import type { AuditLogEntry } from "@/features/admin/types";
import type { CycleProgressSummary, TradeEntry, TradeJournal, TradeSnapshot } from "@/domain/trading-journal/types";

export interface AdminCycleOperationsView {
  cycleId: string;
  journal: TradeJournal | null;
  entries: TradeEntry[];
  snapshots: TradeSnapshot[];
  progress: CycleProgressSummary;
  auditTrail: AuditLogEntry[];
}

export const adminOperationsJournalService = {
  async getCycleOperations(cycleId: string): Promise<AdminCycleOperationsView> {
    await requireRole(USER_ROLES.ADMINISTRATOR);

    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle) throw new Error("Investment cycle not found.");

    const [journal, entries, snapshots, progress, entryAudit, journalAudit] = await Promise.all([
      tradingJournalService.getForAdmin(cycleId),
      tradeEntryService.listByCycle(cycleId, "admin").catch(() => []),
      tradeSnapshotService.listByCycle(cycleId, "admin").catch(() => []),
      cycleProgressService.getSummaryForAdmin(cycleId),
      auditService.listByEntity("trade_entry", cycleId, 30).catch(() => []),
      auditService.listByEntity("investment_cycle", cycleId, 30),
    ]);

    const tradeAudits = await Promise.all(
      entries.slice(0, 10).map((e) => auditService.listByEntity("trade_entry", e.id, 5))
    );

    const auditTrail = [...journalAudit, ...entryAudit, ...tradeAudits.flat()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 40);

    return {
      cycleId,
      journal,
      entries,
      snapshots,
      progress,
      auditTrail,
    };
  },

  async flagOperationalIssue(cycleId: string, reason: string) {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    if (!reason.trim()) throw new Error("A reason is required to flag an operational issue.");
    return cycleProgressService.recordOperationalFlag(cycleId, user.id, reason.trim());
  },

  async recordReview(cycleId: string, note?: string) {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    return cycleProgressService.recordAdminReview(cycleId, user.id, note);
  },
};
