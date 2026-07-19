import Link from "next/link";
import { AdminAdministrationShell } from "@/features/admin/components/admin-administration-shell";
import { ROUTES } from "@/constants/routes";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { INVESTMENT_CYCLE_STATUS_LABELS, type InvestmentCycleStatus } from "@/constants/investment-cycle";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: Array<{ label: string; status: string }> = [
  { label: "Submitted", status: "submitted" },
  { label: "Approved", status: "approved" },
  { label: "Funding", status: "funding" },
  { label: "Active", status: "active" },
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

export default async function AdminInvestmentCyclesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = (rawStatus ?? "submitted") as InvestmentCycleStatus | "active" | "all";

  let cycles = await investmentCycleService.listAll(
    status !== "all" && status !== "active"
      ? { status: status as InvestmentCycleStatus }
      : undefined
  );

  if (status === "active") {
    cycles = cycles.filter((c) =>
      ["approved", "funding", "trading", "distribution"].includes(c.status)
    );
  }

  const managerNames = await getManagerNames([...new Set(cycles.map((c) => c.poolManagerId))]);

  return (
    <AdminAdministrationShell
      title="Investment Cycle Review"
      description="Review funding configuration and lifecycle transitions for investment cycles."
      statusNav={
        <nav className="flex flex-wrap gap-1 border-b border-border pb-3">
          {STATUS_FILTERS.map((item) => {
            const isActive = status === item.status;
            const href =
              item.status === "submitted"
                ? ROUTES.adminInvestmentCycles
                : `${ROUTES.adminInvestmentCycles}?status=${item.status}`;
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
      {cycles.length === 0 ? (
        <p className="text-sm text-navy-500">No cycles match this filter.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-navy-50/50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-4 py-3 font-medium">Cycle</th>
                <th className="px-4 py-3 font-medium">Manager</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Raised</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((cycle) => (
                <tr key={cycle.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{cycle.name}</td>
                  <td className="px-4 py-3 text-navy-600">
                    {managerNames.get(cycle.poolManagerId) ?? "—"}
                  </td>
                  <td className="px-4 py-3">{INVESTMENT_CYCLE_STATUS_LABELS[cycle.status]}</td>
                  <td className="px-4 py-3 text-navy-600">
                    ${cycle.raisedCapital.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${ROUTES.adminInvestmentCycles}/${cycle.id}`}
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
