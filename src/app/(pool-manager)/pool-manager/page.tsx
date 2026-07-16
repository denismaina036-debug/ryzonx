import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Landmark,
  Users,
  Wallet,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";

export default async function PoolManagerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== USER_ROLES.POOL_MANAGER) {
    redirect(ROUTES.applyPoolManager);
  }

  const stats = await poolManagerDashboardService.getDashboardStats();
  const pools = await poolManagerDashboardService.getMyPools();

  const cards = [
    {
      label: "Pools Managed",
      value: String(stats.poolsManaged),
      icon: Landmark,
      accent: "text-amber-300",
    },
    {
      label: "Active Investors",
      value: String(stats.totalInvestors),
      icon: Users,
      accent: "text-sky-300",
    },
    {
      label: "Assets Under Management",
      value: formatCurrency(stats.assetsUnderManagement),
      icon: Wallet,
      accent: "text-emerald-300",
    },
    {
      label: "Recent Deposits",
      value: String(stats.recentDeposits),
      icon: ArrowDownToLine,
      accent: "text-violet-300",
    },
    {
      label: "Pending Withdrawals",
      value: String(stats.pendingWithdrawals),
      icon: ArrowUpFromLine,
      accent: "text-rose-300",
    },
    {
      label: "Live Pools",
      value: String(pools.filter((p) => p.lifecycleStatus === "live").length),
      icon: TrendingUp,
      accent: "text-amber-200",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/80">
          Pool Manager Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          Welcome back, {user.fullName?.split(" ")[0] ?? "Manager"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-navy-400">
          Manage your pools, monitor investor activity, and track performance.
          Deposit and withdrawal approvals remain with RyvonX administration.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-navy-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
                </div>
                <Icon className={cnIcon(card.accent)} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Your Pools</h2>
            <p className="text-sm text-navy-400">
              Create proposals, submit for review, and manage live pools.
            </p>
          </div>
          <Button asChild className="bg-amber-500 hover:bg-amber-400 text-black">
            <Link href={ROUTES.poolManagerPools}>Manage Pools</Link>
          </Button>
        </div>

        {pools.length === 0 ? (
          <p className="mt-6 text-sm text-navy-500">
            No pools yet. Submit your first pool proposal from the Pools page.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-white/[0.04]">
            {pools.slice(0, 5).map((pool) => (
              <li key={pool.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-white">{pool.name}</p>
                  <p className="text-xs capitalize text-navy-500">
                    {pool.lifecycleStatus ?? pool.status}
                  </p>
                </div>
                <span className="text-sm text-navy-400">
                  Min {formatCurrency(pool.minInvestment)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function cnIcon(accent: string) {
  return `h-5 w-5 ${accent}`;
}
