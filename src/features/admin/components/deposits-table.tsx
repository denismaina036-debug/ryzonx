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
import {
  formatCryptoDepositAssetLabel,
  formatCryptoDepositEstimate,
} from "@/lib/transaction/crypto-deposit-meta";
import { formatCurrency } from "@/lib/utils";
import type { AdminDepositRequest } from "@/features/admin/types";

function formatPaymentMethod(method: string): string {
  if (method.toLowerCase() === "crypto") return "Crypto";
  return method;
}

export function DepositsTable({ deposits }: { deposits: AdminDepositRequest[] }) {
  const router = useRouter();
  const [actingId, setActingId] = useState<string | null>(null);

  async function handleAction(action: "approve" | "reject", id: string) {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Action failed");

      toast.success(`Deposit ${action === "approve" ? "approved" : "rejected"}`, {
        description:
          action === "approve"
            ? "Investor wallet credited in USD. They can now choose a pool."
            : "Investor has been notified.",
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActingId(null);
    }
  }

  if (deposits.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-navy-500">No deposits in this view.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Investor</TableHead>
          <TableHead>USD amount</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Asset / network</TableHead>
          <TableHead>Crypto to send</TableHead>
          <TableHead>TX reference</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deposits.map((d) => {
          const cryptoEstimate = formatCryptoDepositEstimate(d.cryptoAmount, d.cryptoSymbol);
          const assetLabel = formatCryptoDepositAssetLabel(d.cryptoSymbol, d.cryptoNetwork);

          return (
            <TableRow key={d.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-navy-950">{d.investorName}</p>
                  <p className="text-xs text-navy-500">{d.investorEmail}</p>
                </div>
              </TableCell>
              <TableCell>
                <p className="font-mono font-semibold text-navy-950">
                  {formatCurrency(d.amount)}
                </p>
                <p className="text-[11px] text-navy-500">Wallet credit (USD)</p>
              </TableCell>
              <TableCell>{formatPaymentMethod(d.paymentMethod)}</TableCell>
              <TableCell className="text-sm text-navy-700">{assetLabel}</TableCell>
              <TableCell className="font-mono text-xs text-navy-600">
                {cryptoEstimate ?? "—"}
              </TableCell>
              <TableCell className="max-w-[140px] truncate font-mono text-xs">
                {d.reference ?? "—"}
              </TableCell>
              <TableCell>
                <TransactionStatusBadge status={d.status} />
              </TableCell>
              <TableCell className="text-xs text-navy-500">
                {new Date(d.submittedAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                {d.status === "pending" && (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      disabled={actingId === d.id}
                      onClick={() => handleAction("approve", d.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actingId === d.id}
                      onClick={() => handleAction("reject", d.id)}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
