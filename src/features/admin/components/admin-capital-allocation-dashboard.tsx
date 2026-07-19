"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { ALLOCATION_STATUS_LABELS, MANAGER_LEVEL_LABELS } from "@/constants/capital-allocation";
import { AdminMetricCard, AdminMetricGrid } from "@/features/admin/components";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CapitalAllocationDashboard } from "@/domain/capital-allocation/types";
import { Banknote, TrendingUp, Users, Shield } from "lucide-react";

export function AdminCapitalAllocationDashboard({ data }: { data: CapitalAllocationDashboard }) {
  const { metrics, settings } = data;
  const [allocateFundId, setAllocateFundId] = useState("");
  const [allocateAmount, setAllocateAmount] = useState("");
  const router = useRouter();

  async function allocate() {
    if (!allocateFundId || !allocateAmount) return;
    try {
      const res = await fetch(`/api/admin/capital-allocation/pools/${allocateFundId}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(allocateAmount), grantBackedBadge: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Capital allocated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-8">
      <AdminMetricGrid columns={6}>
        <AdminMetricCard label="Available Capital" value={formatCurrency(metrics.availableCapital)} icon={Banknote} />
        <AdminMetricCard label="Allocated Capital" value={formatCurrency(metrics.allocatedCapital)} icon={TrendingUp} />
        <AdminMetricCard label="Utilization" value={formatPercentage(metrics.utilizationPct)} icon={Shield} />
        <AdminMetricCard label="Active Allocations" value={String(metrics.activeAllocationCount)} icon={Banknote} />
        <AdminMetricCard label="Pending Reviews" value={String(metrics.pendingReviewCount)} icon={Users} />
        <AdminMetricCard label="RyvonX Backed Pools" value={String(metrics.backedPoolCount)} icon={Shield} changeType="positive" />
      </AdminMetricGrid>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Allocate RyvonX Capital</h3>
        <p className="mt-1 text-xs text-navy-500">
          Approved by the RyvonX Capital Committee. Investor funds are never affected.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Input placeholder="Pool ID" value={allocateFundId} onChange={(e) => setAllocateFundId(e.target.value)} className="w-64" />
          <Input placeholder="Amount ($)" type="number" value={allocateAmount} onChange={(e) => setAllocateAmount(e.target.value)} className="w-32" />
          <Button onClick={allocate}>Allocate</Button>
        </div>
        <p className="mt-2 text-xs text-navy-400">
          Platform pool: {formatCurrency(settings.totalAvailableCapital)} max · Min {formatCurrency(settings.minAllocation ?? 0)}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <PoolList title="Active Allocations" pools={data.activeAllocations} empty="No active allocations." />
        <PoolList title="Pending Reviews" pools={data.pendingReviews} empty="No pending reviews." />
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Manager Rankings</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-navy-500">
                <th className="p-2">Manager</th>
                <th className="p-2">Level</th>
                <th className="p-2">Total AUM</th>
                <th className="p-2">RyvonX Capital</th>
                <th className="p-2">Pools</th>
              </tr>
            </thead>
            <tbody>
              {data.managerRankings.map((m) => (
                <tr key={m.managerId} className="border-b border-border/50">
                  <td className="p-2">
                    <Link href={`${ROUTES.adminPoolManagersDevelopment}/${m.managerId}`} className="font-medium text-royal-600 hover:underline">
                      {m.displayName}
                    </Link>
                  </td>
                  <td className="p-2 text-xs">{MANAGER_LEVEL_LABELS[m.managerLevel] ?? m.managerLevel}</td>
                  <td className="p-2">{formatCurrency(m.totalAum)}</td>
                  <td className="p-2">{formatCurrency(m.ryvonxCapital)}</td>
                  <td className="p-2">{m.poolsManaged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Recent Allocation History</h3>
        <ul className="mt-4 space-y-2">
          {data.recentHistory.slice(0, 10).map((h) => (
            <li key={h.id} className="flex justify-between border-b border-border/50 pb-2 text-sm">
              <span>{h.fundName} — {h.action} {formatCurrency(h.amount)}</span>
              <span className="text-xs text-navy-500">{new Date(h.createdAt).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
        <Link href={ROUTES.adminCapitalHistory} className="mt-3 inline-block text-sm text-royal-600 hover:underline">
          View full history →
        </Link>
      </section>
    </div>
  );
}

function PoolList({
  title,
  pools,
  empty,
}: {
  title: string;
  pools: CapitalAllocationDashboard["activeAllocations"];
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
            <li key={p.fundId} className="rounded-lg bg-surface-1 px-3 py-2 text-sm">
              <p className="font-medium text-navy-800">{p.fundName}</p>
              <p className="text-xs text-navy-500">
                {p.managerName ?? "RyvonX"} · {ALLOCATION_STATUS_LABELS[p.allocationStatus] ?? p.allocationStatus}
              </p>
              <p className="mt-1 text-xs">
                Investor {formatCurrency(p.investorCapital)} ({p.investorPct}%) · RyvonX {formatCurrency(p.ryvonxCapital)} ({p.ryvonxPct}%)
              </p>
              {p.isRyvonxBacked && (
                <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  RyvonX Backed
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
