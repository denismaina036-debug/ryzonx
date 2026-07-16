"use client";

import Link from "next/link";
import { Shield, AlertTriangle, Eye, CheckCircle, Ban, Clock } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  GOVERNANCE_STAGE_LABELS,
  VIOLATION_STATUS_LABELS,
  WARNING_LEVEL_LABELS,
} from "@/constants/governance";
import { AdminMetricCard, AdminMetricGrid } from "@/features/admin/components";
import type { GovernanceDashboardSummary } from "@/domain/governance/types";
import { formatCurrency } from "@/lib/utils";

interface AdminGovernanceDashboardProps {
  data: GovernanceDashboardSummary;
}

export function AdminGovernanceDashboard({ data }: AdminGovernanceDashboardProps) {
  const { metrics } = data;

  return (
    <div className="space-y-8">
      <AdminMetricGrid columns={6}>
        <AdminMetricCard label="Active Pools" value={String(metrics.totalActivePools)} icon={Shield} />
        <AdminMetricCard label="Under Review" value={String(metrics.poolsUnderReview)} icon={Eye} changeType="neutral" change="Committee review" />
        <AdminMetricCard label="Open Violations" value={String(metrics.openViolations)} icon={AlertTriangle} changeType={metrics.openViolations > 0 ? "negative" : "positive"} />
        <AdminMetricCard label="On Probation" value={String(metrics.poolsOnProbation)} icon={Clock} />
        <AdminMetricCard label="Suspended" value={String(metrics.suspendedPools)} icon={Ban} changeType={metrics.suspendedPools > 0 ? "negative" : "positive"} />
        <AdminMetricCard label="Healthy Pools" value={String(metrics.healthyPools)} icon={CheckCircle} changeType="positive" />
      </AdminMetricGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <PoolSection title="Pools Under Review" pools={data.underReview} empty="No pools currently under committee review." />
        <PoolSection title="Watchlist" pools={data.watchlist} empty="No pools on watchlist." />
        <PoolSection title="Warning Status" pools={data.warning} empty="No pools in warning status." />
        <PoolSection title="Probation" pools={data.probation} empty="No pools on probation." />
        <PoolSection title="Restricted" pools={data.restricted} empty="No restricted pools." />
        <PoolSection title="Suspended" pools={data.suspended} empty="No suspended pools." />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-navy-900">Recent Governance Actions</h3>
          <ul className="mt-4 space-y-3">
            {data.recentActions.length === 0 ? (
              <li className="text-sm text-navy-500">No recent actions.</li>
            ) : (
              data.recentActions.map((a) => (
                <li key={a.id} className="border-b border-border/50 pb-3 last:border-0">
                  <p className="text-sm font-medium text-navy-800">{a.title}</p>
                  <p className="text-xs text-navy-500">
                    {a.fundName ?? "Platform"} · {new Date(a.createdAt).toLocaleString()}
                  </p>
                  {a.committeeLabel && (
                    <p className="mt-1 text-xs italic text-royal-600">{a.committeeLabel}</p>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-navy-900">Recent Rule Violations</h3>
          <ul className="mt-4 space-y-3">
            {data.recentViolations.length === 0 ? (
              <li className="text-sm text-navy-500">No violations recorded.</li>
            ) : (
              data.recentViolations.slice(0, 8).map((v) => (
                <li key={v.id} className="flex items-start justify-between gap-2 border-b border-border/50 pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-navy-800">{v.ruleName}</p>
                    <p className="text-xs text-navy-500">{v.fundName}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                    {VIOLATION_STATUS_LABELS[v.status] ?? v.status}
                  </span>
                </li>
              ))
            )}
          </ul>
          <Link href={ROUTES.adminGovernanceViolations} className="mt-4 inline-block text-sm text-royal-600 hover:underline">
            View all violations →
          </Link>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Upcoming Reviews</h3>
        <ul className="mt-4 divide-y divide-border/50">
          {data.upcomingReviews.length === 0 ? (
            <li className="py-2 text-sm text-navy-500">No scheduled reviews.</li>
          ) : (
            data.upcomingReviews.map((r) => (
              <li key={r.fundId} className="flex items-center justify-between py-3">
                <Link href={`${ROUTES.adminGovernance}/pools/${r.fundId}`} className="text-sm font-medium text-navy-800 hover:text-royal-600">
                  {r.fundName}
                </Link>
                <span className="text-xs text-navy-500">
                  {new Date(r.nextReviewAt).toLocaleDateString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function PoolSection({
  title,
  pools,
  empty,
}: {
  title: string;
  pools: GovernanceDashboardSummary["healthy"];
  empty: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold text-navy-900">{title}</h3>
      {pools.length === 0 ? (
        <p className="mt-3 text-sm text-navy-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pools.map((p) => (
            <li key={p.id}>
              <Link
                href={`${ROUTES.adminGovernance}/pools/${p.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-surface-1"
              >
                <div>
                  <p className="text-sm font-medium text-navy-800">{p.name}</p>
                  <p className="text-xs text-navy-500">
                    {p.managerName ?? "RyvonX"} · {GOVERNANCE_STAGE_LABELS[p.governanceStage] ?? p.governanceStage}
                  </p>
                </div>
                <div className="text-right text-xs text-navy-500">
                  <p>{formatCurrency(p.assetsUnderManagement)}</p>
                  <p>{p.activeInvestors} investors</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export { WARNING_LEVEL_LABELS };
