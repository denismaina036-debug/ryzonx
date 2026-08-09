"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { CycleInvestorSettlement } from "@/services/investment-engine/cycle-investor-settlement.service";

type AdminCycleSettlementRow = CycleInvestorSettlement & {
  investorName: string;
  investorEmail: string;
};

export function CycleCapitalReturnsTable({
  settlements,
}: {
  settlements: AdminCycleSettlementRow[];
}) {
  const router = useRouter();
  const [actingId, setActingId] = useState<string | null>(null);

  async function handleAction(action: "approve" | "reject", id: string) {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/cycle-settlements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Action failed");

      toast.success(
        action === "approve"
          ? "Capital returned to investor Funding Wallet."
          : "Capital return request rejected."
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActingId(null);
    }
  }

  if (settlements.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-navy-500">
        No pending cycle capital returns.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Investor</TableHead>
          <TableHead>Pool / Cycle</TableHead>
          <TableHead>Capital</TableHead>
          <TableHead>Profit</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {settlements.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <div>
                <p className="font-medium text-navy-950">{row.investorName}</p>
                <p className="text-xs text-navy-500">{row.investorEmail}</p>
              </div>
            </TableCell>
            <TableCell>
              <p className="font-medium text-navy-950">{row.poolName}</p>
              <p className="text-xs text-navy-500">{row.cycleName}</p>
            </TableCell>
            <TableCell className="font-mono font-medium">
              {formatCurrency(row.principalAmount)}
            </TableCell>
            <TableCell className="font-mono text-sm text-emerald-700">
              {row.profitAmount > 0 ? formatCurrency(row.profitAmount) : "—"}
            </TableCell>
            <TableCell className="text-xs text-navy-500">
              {new Date(row.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="success"
                  disabled={actingId === row.id}
                  onClick={() => handleAction("approve", row.id)}
                >
                  Approve return
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={actingId === row.id}
                  onClick={() => handleAction("reject", row.id)}
                >
                  Reject
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
