import { AdminAdministrationShell } from "@/features/admin/components/admin-administration-shell";
import { AdminOperationsDashboardView } from "@/features/admin/components/admin-operations-dashboard";
import { adminOperationsService } from "@/services/admin-operations.service";

export default async function AdminDashboardPage() {
  let dashboard: Awaited<ReturnType<typeof adminOperationsService.getExecutiveDashboard>> | null =
    null;

  try {
    dashboard = await adminOperationsService.getExecutiveDashboard();
  } catch {
    dashboard = null;
  }

  return (
    <AdminAdministrationShell
      title="Operations Center"
      description="Live platform monitoring — review queues, funding progress, governance alerts, and administrative activity."
    >
      {dashboard ? (
        <AdminOperationsDashboardView data={dashboard} />
      ) : (
        <p className="text-sm text-navy-500">Unable to load operations dashboard.</p>
      )}
    </AdminAdministrationShell>
  );
}
