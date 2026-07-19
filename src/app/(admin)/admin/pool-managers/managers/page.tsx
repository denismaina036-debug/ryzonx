import Link from "next/link";
import { AdminPoolManagersShell } from "@/features/admin/components/admin-pool-managers-shell";
import { ROUTES } from "@/constants/routes";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";

export default async function AdminPoolManagersManagersPage() {
  let managers: Awaited<ReturnType<typeof poolManagerGrowthService.listManagersForDevelopment>> = [];
  try {
    managers = await poolManagerGrowthService.listManagersForDevelopment();
  } catch {
    managers = [];
  }

  return (
    <AdminPoolManagersShell
      title="Active Managers"
      description="All approved pool managers currently operating on the platform."
    >
      {managers.length === 0 ? (
        <p className="text-sm text-navy-500">No active managers yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-navy-50/50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-4 py-3 font-medium">Manager</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Pools</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((manager) => (
                <tr key={manager.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{manager.displayName}</td>
                  <td className="px-4 py-3 capitalize text-navy-600">
                    {manager.managerLevel.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-navy-600">{manager.poolsManaged}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${ROUTES.adminManagers}/${manager.id}`}
                      className="text-sm font-medium text-royal-600 hover:underline"
                    >
                      Oversight
                    </Link>
                    {" · "}
                    <Link
                      href={`${ROUTES.adminPoolManagersDevelopment}/${manager.id}`}
                      className="text-sm font-medium text-royal-600 hover:underline"
                    >
                      Development
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPoolManagersShell>
  );
}
