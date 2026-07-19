import Link from "next/link";
import { AdminAdministrationShell } from "@/features/admin/components/admin-administration-shell";
import { ROUTES } from "@/constants/routes";
import { strategyService } from "@/services/strategy.service";
import { STRATEGY_STATUS_LABELS, type StrategyStatus } from "@/constants/strategy";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: Array<{ label: string; status: string }> = [
  { label: "Awaiting Review", status: "submitted" },
  { label: "Under Review", status: "under_review" },
  { label: "Approved", status: "approved" },
  { label: "All", status: "all" },
];

async function getManagerNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const db = createAdminClient();
  const { data } = await db.from("pool_managers").select("id, display_name").in("id", ids);
  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ id: string; display_name: string }>) {
    map.set(row.id, row.display_name);
  }
  return map;
}

export default async function AdminStrategiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = (rawStatus ?? "submitted") as StrategyStatus | "all";

  let strategies = await strategyService.listAll(
    status !== "all" ? { status: status as StrategyStatus } : undefined
  );

  if (status === "submitted") {
    const underReview = await strategyService.listAll({ status: "under_review" });
    strategies = [...strategies, ...underReview].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  const managerNames = await getManagerNames([...new Set(strategies.map((s) => s.poolManagerId))]);

  return (
    <AdminAdministrationShell
      title="Strategy Review"
      description="Review submitted investment strategies. All lifecycle transitions are enforced by the strategy service."
      statusNav={
        <nav className="flex flex-wrap gap-1 border-b border-border pb-3">
          {STATUS_FILTERS.map((item) => {
            const isActive = status === item.status;
            const href =
              item.status === "all"
                ? ROUTES.adminStrategies
                : `${ROUTES.adminStrategies}?status=${item.status}`;
            return (
              <Link
                key={item.status}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive ? "bg-navy-950 text-white" : "text-navy-500 hover:bg-navy-50 hover:text-navy-800"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      }
    >
      {strategies.length === 0 ? (
        <p className="text-sm text-navy-500">No strategies match this filter.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-navy-50/50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-4 py-3 font-medium">Strategy</th>
                <th className="px-4 py-3 font-medium">Manager</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy) => (
                <tr key={strategy.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{strategy.name}</td>
                  <td className="px-4 py-3 text-navy-600">
                    {managerNames.get(strategy.poolManagerId) ?? "—"}
                  </td>
                  <td className="px-4 py-3">{STRATEGY_STATUS_LABELS[strategy.status]}</td>
                  <td className="px-4 py-3 text-navy-500">
                    {new Date(strategy.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${ROUTES.adminStrategies}/${strategy.id}`}
                      className="text-sm font-medium text-royal-600 hover:underline"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminAdministrationShell>
  );
}
