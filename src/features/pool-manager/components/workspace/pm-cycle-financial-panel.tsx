"use client";



import { useCallback, useEffect, useState } from "react";

import { formatCurrency } from "@/lib/utils";

import { PROFIT_SETTLEMENT_STATUS_LABELS } from "@/constants/profit-distribution";

import { Button } from "@/components/ui/button";

import { PmSectionCard } from "./pm-page-header";

import type { PoolManagerCycleFinancialSummary } from "@/services/pool-manager-financial.service";



export function PmCycleFinancialPanel({ cycleId }: { cycleId: string }) {

  const [summary, setSummary] = useState<PoolManagerCycleFinancialSummary | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState<string | null>(null);



  const load = useCallback(async () => {

    const res = await fetch(`/api/pool-manager/investment-cycles/${cycleId}/financial`);

    const json = (await res.json()) as {

      summary?: PoolManagerCycleFinancialSummary;

      error?: string;

    };

    if (!res.ok) throw new Error(json.error ?? "Failed to load");

    setSummary(json.summary ?? null);

  }, [cycleId]);



  useEffect(() => {

    void load().catch((err) =>

      setError(err instanceof Error ? err.message : "Failed to load")

    );

  }, [load]);



  async function confirmSettlement() {

    if (!summary?.profitSettlement) return;

    setLoading("confirm");

    setError(null);

    try {

      const res = await fetch(

        `/api/pool-manager/finance/settlements/${summary.profitSettlement.id}/confirm`,

        { method: "POST" }

      );

      const json = (await res.json()) as { error?: string };

      if (!res.ok) throw new Error(json.error ?? "Confirm failed");

      await load();

    } catch (err) {

      setError(err instanceof Error ? err.message : "Confirm failed");

    } finally {

      setLoading(null);

    }

  }



  async function distributeEarnings() {

    if (!summary?.profitSettlement) return;

    setLoading("distribute");

    setError(null);

    try {

      const res = await fetch(

        `/api/pool-manager/finance/settlements/${summary.profitSettlement.id}/distribute`,

        { method: "POST" }

      );

      const json = (await res.json()) as { error?: string };

      if (!res.ok) throw new Error(json.error ?? "Distribution failed");

      await load();

    } catch (err) {

      setError(err instanceof Error ? err.message : "Distribution failed");

    } finally {

      setLoading(null);

    }

  }



  if (error && !summary) return null;

  if (!summary) {

    return (

      <PmSectionCard title="Financial Summary">

        <p className="text-sm text-navy-500">Loading financial data…</p>

      </PmSectionCard>

    );

  }



  const ps = summary.profitSettlement;



  return (

    <PmSectionCard title="Financial Summary">

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <Stat label="Raised capital" value={formatCurrency(summary.raisedCapital)} />

        <Stat label="Escrow balance" value={formatCurrency(summary.escrowBalance)} />

        <Stat label="Funding confirmed" value={String(summary.fundingConfirmedCount)} />

        <Stat label="Settled" value={String(summary.settledCount)} />

      </div>



      {ps && (

        <div className="mt-6 space-y-4 rounded-lg border border-border bg-[var(--id-surface-muted)]/30 p-4">

          <h3 className="text-sm font-semibold text-[var(--id-text)]">Cycle Earnings Settlement</h3>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">

            <Stat label="Cycle capital" value={formatCurrency(ps.cycleCapital)} />

            <Stat label="Gross trading profit" value={formatCurrency(ps.grossTradingProfit)} />

            <Stat label="RyvonX service fee (2.5%)" value={formatCurrency(ps.platformServiceFee)} />

            <Stat label="Net distributable profit" value={formatCurrency(ps.netDistributableProfit)} />

            <Stat label="Pool manager share" value={formatCurrency(ps.poolManagerEarnings)} />

            <Stat label="Investor profit pool" value={formatCurrency(ps.investorDistributionTotal)} />

          </div>

          {summary.profitAllocations.length > 0 && (

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="border-b text-left text-[var(--id-text-muted)]">

                    <th className="pb-2 pr-4">Investment</th>

                    <th className="pb-2 pr-4">Pool share</th>

                    <th className="pb-2">Profit allocation</th>

                  </tr>

                </thead>

                <tbody>

                  {summary.profitAllocations.map((row) => (

                    <tr key={row.id} className="border-b border-border/50">

                      <td className="py-2 pr-4">{formatCurrency(row.capitalBasis)}</td>

                      <td className="py-2 pr-4">{(row.ownershipPct * 100).toFixed(2)}%</td>

                      <td className="py-2">{formatCurrency(row.profitShare)}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

              <p className="mt-2 text-xs text-[var(--id-text-muted)]">

                Investor allocations follow the pool Return Structure (investment amount + tier weighting).

              </p>

            </div>

          )}

          <p className="text-xs text-[var(--id-text-muted)]">

            Status:{" "}

            {PROFIT_SETTLEMENT_STATUS_LABELS[ps.status as keyof typeof PROFIT_SETTLEMENT_STATUS_LABELS] ??

              ps.status}

            {ps.settlementDate &&

              ` · Settlement ${new Date(ps.settlementDate).toLocaleDateString()}`}

          </p>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex flex-wrap gap-2">

            {ps.status === "pending_review" && (

              <Button size="sm" disabled={loading != null} onClick={() => void confirmSettlement()}>

                {loading === "confirm" ? "Confirming…" : "Confirm Settlement"}

              </Button>

            )}

            {(ps.status === "confirmed" || ps.status === "distributing") && (

              <Button size="sm" disabled={loading != null} onClick={() => void distributeEarnings()}>

                {loading === "distribute" ? "Distributing…" : "Distribute Earnings"}

              </Button>

            )}

          </div>

        </div>

      )}



      {summary.investorFunding.length > 0 && (

        <div className="mt-4 overflow-x-auto">

          <table className="w-full text-sm">

            <thead>

              <tr className="border-b text-left text-navy-500">

                <th className="pb-2">Reference</th>

                <th className="pb-2">Amount</th>

                <th className="pb-2">Status</th>

              </tr>

            </thead>

            <tbody>

              {summary.investorFunding.map((row) => (

                <tr key={row.referenceNumber} className="border-b border-border/50">

                  <td className="py-2 font-mono text-xs">{row.referenceNumber}</td>

                  <td className="py-2">{formatCurrency(row.amount)}</td>

                  <td className="py-2 capitalize">{row.status.replace(/_/g, " ")}</td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </PmSectionCard>

  );

}



function Stat({ label, value }: { label: string; value: string }) {

  return (

    <div className="rounded-lg border border-border bg-white/60 p-3">

      <p className="text-xs text-navy-500">{label}</p>

      <p className="text-lg font-semibold text-navy-950">{value}</p>

    </div>

  );

}


