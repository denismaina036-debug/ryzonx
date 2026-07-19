"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { PROFIT_SETTLEMENT_STATUS_LABELS } from "@/constants/profit-distribution";
import { PmPageHeader, PmSectionCard } from "@/features/pool-manager/components/workspace/pm-page-header";
import type { PoolManagerFinancialDashboard } from "@/domain/financial/types";

export function PmFinanceDashboardClient() {
  const [dashboard, setDashboard] = useState<PoolManagerFinancialDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/pool-manager/finance/dashboard")
      .then(async (res) => {
        const json = (await res.json()) as {
          dashboard?: PoolManagerFinancialDashboard;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Failed to load");
        setDashboard(json.dashboard ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (!dashboard) {
    return <p className="text-sm text-[var(--id-text-muted)]">Loading financial dashboard…</p>;
  }

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="Finance"
        title="Pool Manager Wallet"
        description="Earnings, distributions, and platform fees across your investment cycles."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Earnings" value={formatCurrency(dashboard.totalEarnings)} />
        <StatCard label="Available Balance" value={formatCurrency(dashboard.availableBalance)} />
        <StatCard label="Pending Distribution" value={formatCurrency(dashboard.pendingDistribution)} />
        <StatCard label="Lifetime Earnings" value={formatCurrency(dashboard.lifetimeEarnings)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Transferred to Investors" value={formatCurrency(dashboard.transferredToInvestors)} />
        <StatCard label="Platform Fees Paid" value={formatCurrency(dashboard.platformFeesPaid)} />
        <StatCard label="Withdrawable Balance" value={formatCurrency(dashboard.availableBalance)} />
      </div>

      <PmSectionCard title="Cycle Earnings" description="Settlement summaries per completed investment cycle.">
        {dashboard.cycleSummaries.length === 0 ? (
          <p className="text-sm text-[var(--id-text-muted)]">No profit settlements yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[var(--id-text-muted)]">
                  <th className="pb-2 pr-4">Cycle</th>
                  <th className="pb-2 pr-4">Trading Profit</th>
                  <th className="pb-2 pr-4">RyvonX Fee</th>
                  <th className="pb-2 pr-4">Your Earnings</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.cycleSummaries.map(({ cycleId, cycleName, settlement }) =>
                  settlement ? (
                    <tr key={cycleId} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium">{cycleName}</td>
                      <td className="py-2 pr-4">{formatCurrency(settlement.grossTradingProfit)}</td>
                      <td className="py-2 pr-4">{formatCurrency(settlement.platformServiceFee)}</td>
                      <td className="py-2 pr-4">{formatCurrency(settlement.poolManagerEarnings)}</td>
                      <td className="py-2 capitalize">
                        {PROFIT_SETTLEMENT_STATUS_LABELS[
                          settlement.status as keyof typeof PROFIT_SETTLEMENT_STATUS_LABELS
                        ] ?? settlement.status}
                      </td>
                    </tr>
                  ) : null
                )}
              </tbody>
            </table>
          </div>
        )}
      </PmSectionCard>

      <PmSectionCard title="Transaction History" description="Profit earnings, fees, and settlement records.">
        {dashboard.transactions.length === 0 ? (
          <p className="text-sm text-[var(--id-text-muted)]">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {dashboard.transactions.map((tx) => (
              <li key={tx.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium text-[var(--id-text)]">{tx.label}</p>
                  <p className="text-[var(--id-text-muted)]">
                    {tx.cycleName ?? "Cycle"} · {new Date(tx.occurredAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={tx.amount < 0 ? "text-rose-600" : "text-emerald-700"}>
                  {formatCurrency(Math.abs(tx.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PmSectionCard>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-[var(--id-text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--id-text)]">{value}</p>
    </div>
  );
}
