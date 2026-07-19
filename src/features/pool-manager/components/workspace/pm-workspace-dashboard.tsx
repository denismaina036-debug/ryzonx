"use client";

import Link from "next/link";
import {
  Layers,
  RefreshCw,
  Wallet,
  Users,
  Clock,
  ArrowRight,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { STRATEGY_STATUS_LABELS } from "@/constants/strategy";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  pmLinkClass,
  pmListLinkClass,
  pmPrimaryButtonClass,
} from "@/features/pool-manager/constants/ui";
import { PmPageHeader, PmSectionCard } from "./pm-page-header";
import { PmStatCard } from "./pm-stat-card";
import { PmStatusBadge } from "./pm-status-badge";
import type { PoolManagerWorkspaceDashboard } from "@/services/pool-manager-workspace.service";

export function PmWorkspaceDashboard({ data }: { data: PoolManagerWorkspaceDashboard }) {
  const { poolStats } = data;

  return (
    <div className="space-y-8">
      <PmPageHeader
        hero
        eyebrow="Pool Manager Workspace"
        title="Dashboard"
        description="Monitor your pools, capital, and investor activity."
        actions={
          <Button asChild className={pmPrimaryButtonClass}>
            <Link href={`${ROUTES.poolManagerPools}/new`}>Create New Pool</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PmStatCard label="My Pools" value={String(poolStats.poolsManaged)} icon={Layers} />
        <PmStatCard
          label="Live Pools"
          value={String(data.activeCycles.length)}
          icon={RefreshCw}
          accent="indigo"
        />
        <PmStatCard
          label="Assets Under Management"
          value={formatCurrency(poolStats.assetsUnderManagement)}
          icon={Wallet}
          accent="success"
        />
        <PmStatCard
          label="Active Investors"
          value={String(poolStats.totalInvestors)}
          icon={Users}
          accent="indigo"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PmStatCard label="Draft Strategies" value={String(data.draftStrategies.length)} icon={Layers} accent="muted" />
        <PmStatCard label="Submitted Strategies" value={String(data.submittedStrategies.length)} icon={Clock} accent="indigo" />
        <PmStatCard label="Draft Cycles" value={String(data.draftCycles.length)} icon={RefreshCw} accent="muted" />
        <PmStatCard label="Pending Reviews" value={String(data.pendingReviews)} icon={Clock} accent="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PmSectionCard
          title="My Pools"
          description="Your investment pools"
          actions={
            <Link href={ROUTES.poolManagerPools} className={pmLinkClass}>
              View all
            </Link>
          }
        >
          {data.strategies.length === 0 && data.cycles.length === 0 ? (
            <p className="text-sm text-[var(--id-text-muted)]">No pools yet. Create your first pool to begin.</p>
          ) : (
            <ul className="divide-y divide-[var(--id-border)]">
              {data.strategies.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={ROUTES.poolManagerPools} className={pmListLinkClass}>
                      {s.name}
                    </Link>
                  </div>
                  <PmStatusBadge label={STRATEGY_STATUS_LABELS[s.status]} status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </PmSectionCard>

        <PmSectionCard
          title="Pool Activity"
          description="Funding and trading updates"
          actions={
            <Link href={ROUTES.poolManagerPools} className={pmLinkClass}>
              View all
            </Link>
          }
        >
          {data.cycles.length === 0 ? (
            <p className="text-sm text-[var(--id-text-muted)]">Pool activity will appear once you create and submit a pool.</p>
          ) : (
            <ul className="divide-y divide-[var(--id-border)]">
              {data.cycles.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={ROUTES.poolManagerPools} className={pmListLinkClass}>
                      {c.name}
                    </Link>
                    <p className="text-xs text-[var(--id-text-muted)]">{formatCurrency(c.raisedCapital)} raised</p>
                  </div>
                  <PmStatusBadge
                    label={INVESTMENT_CYCLE_STATUS_LABELS[c.status]}
                    status={c.status}
                  />
                </li>
              ))}
            </ul>
          )}
        </PmSectionCard>
      </div>

      <PmSectionCard title="Recent Activity" description="Latest updates across your workspace">
        {data.recentActivity.length === 0 ? (
          <p className="text-sm text-[var(--id-text-muted)]">Activity will appear as you create and manage pools.</p>
        ) : (
          <ul className="divide-y divide-[var(--id-border)]">
            {data.recentActivity.map((item) => (
              <li key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--id-text)]">{item.title}</p>
                  <p className="text-xs capitalize text-[var(--id-text-muted)]">
                    {item.type} · {item.status.replace(/_/g, " ")}
                  </p>
                </div>
                <Link href={item.href} className={`inline-flex items-center gap-1 ${pmLinkClass}`}>
                  View <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PmSectionCard>

      <PmSectionCard title="Closed Pools" description={`${data.closedCycles.length} completed or archived`}>
        {data.closedCycles.length === 0 ? (
          <p className="text-sm text-[var(--id-text-muted)]">Completed cycles will appear here for historical reference.</p>
        ) : (
          <ul className="divide-y divide-[var(--id-border)]">
            {data.closedCycles.slice(0, 4).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--id-text-secondary)]">{c.name}</span>
                <PmStatusBadge label={INVESTMENT_CYCLE_STATUS_LABELS[c.status]} status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </PmSectionCard>
    </div>
  );
}
