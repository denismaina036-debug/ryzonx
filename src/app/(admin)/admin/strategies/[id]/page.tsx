import { notFound } from "next/navigation";
import { AdminAdministrationShell } from "@/features/admin/components/admin-administration-shell";
import { AdminStrategyReviewClient } from "@/features/admin/components/admin-strategy-review-client";
import { ROUTES } from "@/constants/routes";
import { strategyService } from "@/services/strategy.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { adminNotesService } from "@/services/admin-notes.service";
import { auditService } from "@/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";

async function getManagerName(managerId: string): Promise<string> {
  const db = createAdminClient();
  const { data } = await db.from("pool_managers").select("display_name").eq("id", managerId).maybeSingle();
  return (data as { display_name?: string } | null)?.display_name ?? "Unknown Manager";
}

export default async function AdminStrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const strategy = await strategyService.getById(id);
  if (!strategy) notFound();

  const [cycles, notes, history, managerName] = await Promise.all([
    investmentCycleService.listAll().then((items) =>
      items.filter((c) => c.strategyId === strategy.id)
    ),
    adminNotesService.listNotes("strategy", id),
    auditService.listByEntity("strategy", id),
    getManagerName(strategy.poolManagerId),
  ]);

  return (
    <AdminAdministrationShell
      title="Strategy Review"
      description="Complete strategy review workflow with lifecycle-validated actions."
    >
      <AdminStrategyReviewClient
        strategy={strategy}
        cycles={cycles}
        managerName={managerName}
        managerHref={`${ROUTES.adminManagers}/${strategy.poolManagerId}`}
        notes={notes}
        history={history}
      />
    </AdminAdministrationShell>
  );
}
