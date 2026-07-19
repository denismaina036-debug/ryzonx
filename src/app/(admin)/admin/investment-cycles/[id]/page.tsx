import { notFound } from "next/navigation";
import { AdminAdministrationShell } from "@/features/admin/components/admin-administration-shell";
import { AdminCycleReviewClient } from "@/features/admin/components/admin-cycle-review-client";
import { AdminCycleOperationsPanel } from "@/features/admin/components/admin-cycle-operations-panel";
import { ROUTES } from "@/constants/routes";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { strategyService } from "@/services/strategy.service";
import { adminNotesService } from "@/services/admin-notes.service";
import { auditService } from "@/services/audit.service";
import { adminOperationsJournalService } from "@/services/admin-operations-journal.service";
import { createAdminClient } from "@/lib/supabase/admin";

async function getManagerName(managerId: string): Promise<string> {
  const db = createAdminClient();
  const { data } = await db.from("pool_managers").select("display_name").eq("id", managerId).maybeSingle();
  return (data as { display_name?: string } | null)?.display_name ?? "Unknown Manager";
}

export default async function AdminInvestmentCycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cycle = await investmentCycleService.getById(id);
  if (!cycle) notFound();

  const [strategy, notes, history, managerName, operations] = await Promise.all([
    strategyService.getById(cycle.strategyId),
    adminNotesService.listNotes("investment_cycle", id),
    auditService.listByEntity("investment_cycle", id),
    getManagerName(cycle.poolManagerId),
    adminOperationsJournalService.getCycleOperations(id).catch(() => null),
  ]);

  return (
    <AdminAdministrationShell
      title="Investment Cycle Review"
      description="Funding configuration, allocations, and lifecycle review."
    >
      <AdminCycleReviewClient
        cycle={cycle}
        strategy={strategy}
        managerName={managerName}
        managerHref={`${ROUTES.adminManagers}/${cycle.poolManagerId}`}
        notes={notes}
        history={history}
      />
      {operations && (
        <div className="mt-8">
          <AdminCycleOperationsPanel cycleId={id} initial={operations} />
        </div>
      )}
    </AdminAdministrationShell>
  );
}
