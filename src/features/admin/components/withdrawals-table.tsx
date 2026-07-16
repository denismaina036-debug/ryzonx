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
import { TransactionStatusBadge } from "@/features/admin/components/status-badge";
import { formatCurrency } from "@/lib/utils";
import type { AdminWithdrawalRequest } from "@/features/admin/types";

export function WithdrawalsTable({
  withdrawals,
}: {
  withdrawals: AdminWithdrawalRequest[];
}) {
  const router = useRouter();
  const [actingId, setActingId] = useState<string | null>(null);

  async function handleAction(action: "approve" | "reject", id: string) {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Action failed");

      toast.success(`Withdrawal ${action === "approve" ? "approved" : "rejected"}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActingId(null);
    }
  }

  if (withdrawals.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-navy-500">
        No withdrawals in this view.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Investor</TableHead>
          <TableHead>Fund</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Available</TableHead>
          <TableHead>Destination</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {withdrawals.map((w) => (
          <TableRow key={w.id}>
            <TableCell>
              <div>
                <p className="font-medium text-navy-950">{w.investorName}</p>
                <p className="text-xs text-navy-500">{w.investorEmail}</p>
              </div>
            </TableCell>
            <TableCell>{w.fundName}</TableCell>
            <TableCell className="font-mono font-medium">
              {formatCurrency(w.amount)}
            </TableCell>
            <TableCell className="font-mono text-sm">
              {formatCurrency(w.withdrawableBalance)}
            </TableCell>
            <TableCell className="text-xs">{w.destination}</TableCell>
            <TableCell>
              <TransactionStatusBadge status={w.status} />
            </TableCell>
            <TableCell className="text-xs text-navy-500">
              {new Date(w.submittedAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              {w.status === "pending" && (
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    disabled={actingId === w.id}
                    onClick={() => handleAction("approve", w.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actingId === w.id}
                    onClick={() => handleAction("reject", w.id)}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
