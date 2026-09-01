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
  const [approvalTarget, setApprovalTarget] = useState<AdminDepositRequest | null>(null);
  const [senderWallet, setSenderWallet] = useState("");

  function openApproval(deposit: AdminDepositRequest) {
    setApprovalTarget(deposit);
    setSenderWallet(deposit.senderWallet ?? "");
  }

  async function handleAction(
    action: "approve" | "reject",
    id: string,
    confirmedSenderWallet?: string
  ) {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, senderWallet: confirmedSenderWallet }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Action failed");

      toast.success(`Deposit ${action === "approve" ? "approved" : "rejected"}`, {
        description:
          action === "approve"
            ? "Investor wallet credited in USD. They can now choose a pool."
            : "Investor has been notified.",
      });
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
    const normalized = senderWallet.trim();
    if (normalized && (!/^\S{6,160}$/.test(normalized) || /[<>]/.test(normalized))) {
      toast.error("Enter a valid sender wallet address");
      return;
    }
    void handleAction("approve", approvalTarget.id, normalized || undefined);
  }

  if (deposits.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-navy-500">No deposits in this view.</p>
    );
  }

  return (
    <>
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
                      onClick={() => openApproval(d)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actingId === d.id}
                      onClick={() => void handleAction("reject", d.id)}
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

    <Dialog
      open={Boolean(approvalTarget)}
      onOpenChange={(open) => {
        if (!open && !actingId) setApprovalTarget(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve deposit</DialogTitle>
          <DialogDescription>
            Record the wallet that sent this deposit. It will appear as the sender in the
            investor&apos;s completed transaction.
          </DialogDescription>
        </DialogHeader>

        {approvalTarget && (
          <div className="space-y-5">
            <div className="rounded-xl border border-navy-100 bg-navy-50/70 p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-navy-500">Deposit</span>
                <span className="font-mono font-semibold text-navy-950">
                  {formatCurrency(approvalTarget.amount)}
                </span>
              </div>
              <p className="mt-2 text-xs text-navy-500">
                {approvalTarget.investorName} · {formatCryptoDepositAssetLabel(
                  approvalTarget.cryptoSymbol,
                  approvalTarget.cryptoNetwork
                )}
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-navy-800">Sender wallet</span>
              <Input
                value={senderWallet}
                onChange={(event) => setSenderWallet(event.target.value)}
                placeholder="Wallet address that sent the deposit"
                autoComplete="off"
                spellCheck={false}
                maxLength={160}
                className="font-mono"
                autoFocus
              />
              <span className="block text-xs text-navy-500">
                Optional for non-wallet deposits.
              </span>
            </label>
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
            {actingId === approvalTarget?.id ? "Approving…" : "Approve deposit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
