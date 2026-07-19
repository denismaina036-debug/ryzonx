"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Download, RefreshCw } from "lucide-react";
import { AdminFinanceShell } from "@/features/admin/components/admin-finance-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { AdminFinancialOperationsView, PlatformRevenueSummary } from "@/domain/financial/types";

export function AdminFinancialOperationsCenter() {
  const [data, setData] = useState<AdminFinancialOperationsView | null>(null);
  const [revenue, setRevenue] = useState<PlatformRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [opsRes, revRes] = await Promise.all([
        fetch("/api/admin/finance/operations"),
        fetch("/api/admin/finance/platform-revenue"),
      ]);
      const json = (await opsRes.json()) as { operations?: AdminFinancialOperationsView; error?: string };
      const revJson = (await revRes.json()) as { summary?: PlatformRevenueSummary; error?: string };
      if (!opsRes.ok) throw new Error(json.error ?? "Failed to load");
      setData(json.operations ?? null);
      setRevenue(revJson.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function processBatch(batchId: string) {
    setActionId(batchId);
    try {
      const res = await fetch(`/api/admin/finance/settlements/${batchId}/process`, { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Process failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Process failed");
    } finally {
      setActionId(null);
    }
  }

  async function completeDistribution(recordId: string) {
    setActionId(recordId);
    try {
      const res = await fetch(`/api/admin/finance/distributions/${recordId}/complete`, { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Complete failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Complete failed");
    } finally {
      setActionId(null);
    }
  }

  function exportStatement(type: string) {
    window.open(`/api/admin/finance/statements/${type}`, "_blank");
  }

  const health = data?.health;

  return (
    <AdminFinanceShell
      title="Financial Operations Center"
      description="Settlement queue, distribution queue, ledger explorer, and accounting integrity — the authoritative financial control plane."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HealthCard
          label="Ledger balanced"
          value={health?.ledgerBalanced ? "Yes" : "No"}
          ok={health?.ledgerBalanced ?? false}
        />
        <HealthCard label="Pending settlements" value={health?.pendingSettlements ?? 0} />
        <HealthCard label="Pending distributions" value={health?.pendingDistributions ?? 0} />
        <HealthCard label="Outstanding adjustments" value={health?.outstandingAdjustments ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settlement Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.settlementQueue ?? []).length === 0 && (
              <p className="text-sm text-navy-500">No pending settlement batches.</p>
            )}
            {(data?.settlementQueue ?? []).map((batch) => (
              <div key={batch.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-navy-900">{batch.batchReference}</p>
                  <p className="text-xs text-navy-500">
                    {batch.allocationCount} allocations · {formatCurrency(batch.totalAmount)} · {batch.status}
                  </p>
                </div>
                {batch.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => void processBatch(batch.id)}
                    disabled={actionId === batch.id}
                  >
                    Process
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribution Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.distributionQueue ?? []).length === 0 && (
              <p className="text-sm text-navy-500">No pending distributions.</p>
            )}
            {(data?.distributionQueue ?? []).slice(0, 10).map((record) => (
              <div key={record.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-navy-900">{formatCurrency(record.amount)}</p>
                  <p className="text-xs text-navy-500">{record.status}</p>
                </div>
                {["approved", "pending", "batch"].includes(record.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void completeDistribution(record.id)}
                    disabled={actionId === record.id}
                  >
                    Complete
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Ledger Explorer</CardTitle>
          <div className="flex flex-wrap gap-2">
            {["platform", "ledger", "settlement"].map((type) => (
              <Button key={type} variant="ghost" size="sm" onClick={() => exportStatement(type)}>
                <Download className="mr-1 h-3.5 w-3.5" />
                {type}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-navy-500">
                  <th className="pb-2 pr-4">Reference</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentTransactions ?? []).map((tx) => (
                  <tr key={tx.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono text-xs">{tx.reference}</td>
                    <td className="py-2 pr-4">{tx.transactionType}</td>
                    <td className="py-2 text-navy-700">{tx.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {revenue && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Revenue (RyvonX Service Fees)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <HealthCard label="Total earned" value={formatCurrency(revenue.totalServiceFeesEarned)} ok />
              <HealthCard label="Today" value={formatCurrency(revenue.dailyRevenue)} />
              <HealthCard label="This month" value={formatCurrency(revenue.monthlyRevenue)} />
              <HealthCard label="This year" value={formatCurrency(revenue.yearlyRevenue)} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Batch History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.batchHistory ?? []).slice(0, 8).map((batch) => (
            <div key={batch.id} className="flex justify-between text-sm">
              <span>{batch.batchReference}</span>
              <span className="text-navy-500">
                {formatCurrency(batch.totalAmount)} · {batch.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminFinanceShell>
  );
}

function HealthCard({
  label,
  value,
  ok,
}: {
  label: string;
  value: string | number;
  ok?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        {ok === true && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        {ok === false && <AlertTriangle className="h-5 w-5 text-amber-600" />}
        <div>
          <p className="text-xs text-navy-500">{label}</p>
          <p className="text-xl font-semibold text-navy-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
