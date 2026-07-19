"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Briefcase,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { ROUTES, adminFinanceDepositsPath } from "@/constants/routes";
import { AdminMetricCard, AdminMetricGrid } from "@/features/admin/components";
import { AdminQuickActions } from "@/features/admin/components/quick-actions";
import type { AdminOperationsDashboard } from "@/services/admin-operations.service";
import { formatCurrency } from "@/lib/utils";
import { STRATEGY_STATUS_LABELS } from "@/constants/strategy";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";

export function AdminOperationsDashboardView({ data }: { data: AdminOperationsDashboard }) {
  const { fundingSummary, governance } = data;
  const fundingPct =
    fundingSummary.totalTarget > 0
      ? Math.round((fundingSummary.totalRaised / fundingSummary.totalTarget) * 1000) / 10
      : null;

  return (
    <div className="space-y-8">
      <AdminMetricGrid columns={6}>
        <AdminMetricCard
          label="Open Reviews"
          value={String(data.openReviews)}
          icon={Eye}
          changeType={data.openReviews > 0 ? "negative" : "positive"}
          change={data.openReviews > 0 ? "Requires attention" : "Queue clear"}
        />
        <AdminMetricCard
          label="Strategies Pending"
          value={String(data.submittedStrategies.length)}
          icon={FileText}
          changeType={data.submittedStrategies.length > 0 ? "neutral" : "positive"}
        />
        <AdminMetricCard
          label="Cycles Pending"
          value={String(data.submittedCycles.length)}
          icon={RefreshCw}
          changeType={data.submittedCycles.length > 0 ? "neutral" : "positive"}
        />
        <AdminMetricCard label="Active Managers" value={String(data.activeManagers)} icon={Users} />
        <AdminMetricCard label="Active Investors" value={String(data.activeInvestors)} icon={Users} />
        <AdminMetricCard
          label="Active Cycles"
          value={String(data.activeCycles.length)}
          icon={TrendingUp}
        />
      </AdminMetricGrid>

      <AdminMetricGrid columns={6}>
        <AdminMetricCard
          label="Funding Raised"
          value={formatCurrency(fundingSummary.totalRaised)}
          icon={Briefcase}
          change={
            fundingPct != null
              ? `${fundingPct}% of ${formatCurrency(fundingSummary.totalTarget)} target`
              : `${fundingSummary.cyclesInFunding} cycles open`
          }
          changeType="neutral"
        />
        <AdminMetricCard
          label="Pending Deposits"
          value={String(data.pendingDeposits)}
          icon={ArrowDownToLine}
          changeType={data.pendingDeposits > 0 ? "negative" : "positive"}
        />
        <AdminMetricCard
          label="Pending Withdrawals"
          value={String(data.pendingWithdrawals)}
          icon={ArrowUpFromLine}
          changeType={data.pendingWithdrawals > 0 ? "negative" : "positive"}
        />
        <AdminMetricCard
          label="Governance Violations"
          value={String(governance?.metrics.openViolations ?? 0)}
          icon={AlertTriangle}
          changeType={(governance?.metrics.openViolations ?? 0) > 0 ? "negative" : "positive"}
        />
        <AdminMetricCard
          label="Pools Under Review"
          value={String(governance?.metrics.poolsUnderReview ?? 0)}
          icon={Shield}
        />
        <AdminMetricCard
          label="Healthy Pools"
          value={String(governance?.metrics.healthyPools ?? 0)}
          icon={CheckCircle}
          changeType="positive"
        />
      </AdminMetricGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReviewQueue
          title="Strategy Review Queue"
          empty="No strategies awaiting review."
          href={ROUTES.adminStrategies}
          items={data.submittedStrategies.slice(0, 6).map((s) => ({
            id: s.id,
            name: s.name,
            status: STRATEGY_STATUS_LABELS[s.status],
            href: `${ROUTES.adminStrategies}/${s.id}`,
          }))}
        />
        <ReviewQueue
          title="Investment Cycle Review Queue"
          empty="No cycles awaiting approval."
          href={ROUTES.adminInvestmentCycles}
          items={data.submittedCycles.slice(0, 6).map((c) => ({
            id: c.id,
            name: c.name,
            status: INVESTMENT_CYCLE_STATUS_LABELS[c.status],
            href: `${ROUTES.adminInvestmentCycles}/${c.id}`,
          }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-navy-900">Lifecycle Bottlenecks</h3>
          <ul className="mt-4 space-y-2">
            {data.lifecycleBottlenecks.length === 0 ? (
              <li className="text-sm text-navy-500">No operational bottlenecks detected.</li>
            ) : (
              data.lifecycleBottlenecks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-navy-50"
                  >
                    <span className="text-navy-800">{item.label}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {item.count}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-navy-900">Platform Health</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <HealthRow
              label="Governance compliance"
              ok={(governance?.metrics.openViolations ?? 0) === 0}
              detail={
                (governance?.metrics.openViolations ?? 0) === 0
                  ? "No open violations"
                  : `${governance?.metrics.openViolations} open violations`
              }
            />
            <HealthRow
              label="Review queue"
              ok={data.openReviews === 0}
              detail={data.openReviews === 0 ? "All queues clear" : `${data.openReviews} items pending`}
            />
            <HealthRow
              label="Finance operations"
              ok={data.pendingDeposits === 0 && data.pendingWithdrawals === 0}
              detail={`${data.pendingDeposits} deposits · ${data.pendingWithdrawals} withdrawals pending`}
            />
            <HealthRow
              label="Funding operations"
              ok
              detail={`${fundingSummary.cyclesInFunding} cycles actively fundraising`}
            />
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={ROUTES.adminGovernance} className="text-sm text-royal-600 hover:underline">
              Governance Center →
            </Link>
            <Link href={adminFinanceDepositsPath("pending")} className="text-sm text-royal-600 hover:underline">
              Finance queue →
            </Link>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-navy-900">Recent Administrative Activity</h3>
          <Link href={ROUTES.adminAuditLogs} className="text-sm text-royal-600 hover:underline">
            View audit logs →
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-border/50">
          {data.recentActivity.length === 0 ? (
            <li className="py-2 text-sm text-navy-500">No recent activity.</li>
          ) : (
            data.recentActivity.slice(0, 12).map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-navy-800">{entry.summary}</p>
                  <p className="text-xs text-navy-500">{entry.actorName}</p>
                </div>
                <span className="shrink-0 text-xs text-navy-400">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {governance && (governance.recentViolations.length > 0 || governance.upcomingReviews.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-5">
            <h3 className="flex items-center gap-2 font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              Compliance Warnings
            </h3>
            <ul className="mt-4 space-y-2">
              {governance.recentViolations.length === 0 ? (
                <li className="text-sm text-navy-500">No recent violations.</li>
              ) : (
                governance.recentViolations.slice(0, 5).map((v) => (
                  <li key={v.id} className="text-sm text-amber-950">
                    {v.ruleName} — {v.fundName}
                  </li>
                ))
              )}
            </ul>
            <Link href={ROUTES.adminGovernanceViolations} className="mt-3 inline-block text-sm text-amber-800 hover:underline">
              View all violations →
            </Link>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 font-semibold text-navy-900">
              <Clock className="h-4 w-4" />
              Governance Alerts
            </h3>
            <ul className="mt-4 space-y-2">
              {governance.upcomingReviews.length === 0 ? (
                <li className="text-sm text-navy-500">No upcoming governance reviews.</li>
              ) : (
                governance.upcomingReviews.slice(0, 5).map((r) => (
                  <li key={r.fundId} className="flex justify-between text-sm">
                    <Link href={`${ROUTES.adminGovernance}/pools/${r.fundId}`} className="text-navy-800 hover:text-royal-600">
                      {r.fundName}
                    </Link>
                    <span className="text-xs text-navy-500">
                      {r.nextReviewAt ? new Date(r.nextReviewAt).toLocaleDateString() : "Scheduled"}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}

      <AdminQuickActions />
    </div>
  );
}

function ReviewQueue({
  title,
  empty,
  href,
  items,
}: {
  title: string;
  empty: string;
  href: string;
  items: Array<{ id: string; name: string; status: string; href: string }>;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-navy-900">{title}</h3>
        <Link href={href} className="text-sm text-royal-600 hover:underline">
          View all →
        </Link>
      </div>
      <ul className="mt-4 space-y-2">
        {items.length === 0 ? (
          <li className="text-sm text-navy-500">{empty}</li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 hover:bg-navy-50"
              >
                <span className="text-sm font-medium text-navy-800">{item.name}</span>
                <span className="text-xs text-navy-500">{item.status}</span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function HealthRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <div>
        <p className="font-medium text-navy-800">{label}</p>
        <p className="text-xs text-navy-500">{detail}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
          ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
        }`}
      >
        {ok ? "Healthy" : "Attention"}
      </span>
    </li>
  );
}
