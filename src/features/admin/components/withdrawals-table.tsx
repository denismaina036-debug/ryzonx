"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const [approvalTarget, setApprovalTarget] = useState<AdminWithdrawalRequest | null>(null);
  const [feeAmount, setFeeAmount] = useState("");
  const [feeCurrency, setFeeCurrency] = useState("USDT");

  function openApproval(withdrawal: AdminWithdrawalRequest) {
    setApprovalTarget(withdrawal);
    setFeeAmount("");
    setFeeCurrency(withdrawal.cryptoSymbol?.toUpperCase() || "USDT");
  }

  async function handleAction(
    action: "approve" | "reject",
    id: string,
    fee?: { amount: number; currency: string }
  ) {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          transactionFee: fee?.amount,
          feeCurrency: fee?.currency,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Action failed");

      toast.success(`Withdrawal ${action === "approve" ? "approved" : "rejected"}`);
      if (action === "approve") setApprovalTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActingId(null);
    }
  }

  function confirmApproval() {
    if (!approvalTarget) return;
    const parsedFee = Number(feeAmount);
    const normalizedCurrency = feeCurrency.trim().toUpperCase();
    if (
      feeAmount.trim() === "" ||
      !Number.isFinite(parsedFee) ||
      parsedFee < 0 ||
      !/^[A-Z0-9]{2,10}$/.test(normalizedCurrency)
    ) {
      toast.error("Enter a valid transaction fee and currency");
      return;
    }
    void handleAction("approve", approvalTarget.id, {
      amount: parsedFee,
      currency: normalizedCurrency,
    });
  }

  if (withdrawals.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-navy-500">
        No withdrawals in this view.
      </p>
    );
  }

  return (
    <>
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
                    onClick={() => openApproval(w)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actingId === w.id}
                    onClick={() => void handleAction("reject", w.id)}
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

      <Dialog
        open={Boolean(approvalTarget)}
        onOpenChange={(open) => {
          if (!open && !actingId) setApprovalTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve withdrawal</DialogTitle>
            <DialogDescription>
              Record the actual network transaction fee. This is displayed to the investor and
              does not change their approved withdrawal amount.
            </DialogDescription>
          </DialogHeader>

          {approvalTarget && (
            <div className="space-y-5">
              <div className="rounded-xl border border-navy-100 bg-navy-50/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-navy-500">Withdrawal</span>
                  <span className="font-mono font-semibold text-navy-950">
                    {formatCurrency(approvalTarget.amount)}
                  </span>
                </div>
                <div className="mt-3 border-t border-navy-100 pt-3">
                  <p className="text-xs text-navy-500">Recipient wallet</p>
                  <p className="mt-1 break-all font-mono text-xs text-navy-950">
                    {approvalTarget.destination}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-navy-800">Transaction fee</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={feeAmount}
                    onChange={(event) => setFeeAmount(event.target.value)}
                    placeholder="0.00"
                    autoFocus
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-navy-800">Currency</span>
                  <Input
                    value={feeCurrency}
                    onChange={(event) => setFeeCurrency(event.target.value.toUpperCase())}
                    maxLength={10}
                    placeholder="USDT"
                  />
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(actingId)}
              onClick={() => setApprovalTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="success"
              disabled={!approvalTarget || actingId === approvalTarget.id}
              onClick={confirmApproval}
            >
              {actingId === approvalTarget?.id ? "Approving…" : "Approve withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
