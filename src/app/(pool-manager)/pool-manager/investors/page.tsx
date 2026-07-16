import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";
import { formatCurrency } from "@/lib/utils";

export default async function PoolManagerInvestorsPage() {
  const pools = await poolManagerDashboardService.getMyPools();
  const investorGroups = await Promise.all(
    pools.map(async (pool) => ({
      pool,
      investors: await poolManagerDashboardService.getPoolInvestors(pool.id).catch(() => []),
    }))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Investors</h1>
        <p className="mt-2 text-sm text-navy-400">View-only access to investors in your pools.</p>
      </div>
      {investorGroups.every((g) => g.investors.length === 0) ? (
        <p className="text-sm text-navy-500">No investors in your pools yet.</p>
      ) : (
        investorGroups.map(({ pool, investors }) =>
          investors.length > 0 ? (
            <div key={pool.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h2 className="font-semibold text-white">{pool.name}</h2>
              <ul className="mt-4 divide-y divide-white/[0.04]">
                {investors.map((inv) => (
                  <li key={inv.userId} className="flex justify-between py-3 text-sm">
                    <div>
                      <p className="text-white">{inv.fullName}</p>
                      <p className="text-navy-500">{inv.email}</p>
                    </div>
                    <div className="text-right text-navy-300">
                      <p>{formatCurrency(inv.currentValue)}</p>
                      <p className="text-xs text-navy-500">{inv.ownershipPct.toFixed(2)}%</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        )
      )}
      <Link href={ROUTES.poolManager} className="text-sm text-amber-300/80">
        ← Overview
      </Link>
    </div>
  );
}
