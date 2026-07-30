"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Strategy } from "@/domain/investment/types";
import { adminTransitionStrategy } from "@/features/admin/components/admin-review-api";

function simplifyStatus(status: string): string {
  if (status === "submitted" || status === "under_review") return "Pending";
  if (status === "approved" || status === "available") return "Approved";
  if (status === "archived") return "Rejected";
  return status.replace(/_/g, " ");
}

export function AdminStrategiesReviewClient({
  strategies,
  managerNames,
}: {
  strategies: Strategy[];
  managerNames: Map<string, string>;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function approve(id: string, currentStatus: string) {
    setLoadingId(id);
    try {
      if (currentStatus === "submitted") {
        await adminTransitionStrategy(id, "under_review");
      }
      await adminTransitionStrategy(id, "approved");
      toast.success("Strategy approved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setLoadingId(null);
    }
  }

  async function reject(id: string, currentStatus: string) {
    setLoadingId(id);
    try {
      if (currentStatus === "submitted") {
        await adminTransitionStrategy(id, "under_review");
      }
      await adminTransitionStrategy(id, "archived");
      toast.success("Strategy rejected");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setLoadingId(null);
    }
  }

  if (strategies.length === 0) {
    return <p className="text-sm text-navy-500">No strategies awaiting review.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-navy-50/50 text-left text-xs uppercase tracking-wide text-navy-500">
            <th className="px-4 py-3 font-medium">Strategy</th>
            <th className="px-4 py-3 font-medium">Manager</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {strategies.map((strategy) => {
            const pending = strategy.status === "submitted" || strategy.status === "under_review";
            const loading = loadingId === strategy.id;
            return (
              <tr key={strategy.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-navy-900">{strategy.name}</td>
                <td className="px-4 py-3 text-navy-600">
                  {managerNames.get(strategy.poolManagerId) ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      pending
                        ? "inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900"
                        : "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900"
                    }
                  >
                    {simplifyStatus(strategy.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {pending ? (
                      <>
                        <Button
                          size="sm"
                          disabled={loading}
                          onClick={() => void approve(strategy.id, strategy.status)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() => void reject(strategy.id, strategy.status)}
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-navy-400">Reviewed</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
