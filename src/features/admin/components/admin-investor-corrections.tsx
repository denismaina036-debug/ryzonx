"use client";

import { useState } from "react";
import { AdminFinanceShell } from "@/features/admin/components/admin-finance-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type Item = { id: string; amount: number; status: string; label: string };
type WithdrawalHold = {
  investor_id: string;
  is_withdrawal_allowed: boolean;
  corrected_at: string;
  released_at: string | null;
  released_by: string | null;
};
type Investor = {
  profile: { id: string; full_name: string | null; email: string };
  deposits: Item[];
  allocations: Item[];
  withdrawalHold: WithdrawalHold | null;
};

export function AdminInvestorCorrections() {
  const [email, setEmail] = useState("");
  const [data, setData] = useState<Investor | null>(null);
  const [reason, setReason] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call<T>(method: "GET" | "PATCH" | "POST", body?: unknown): Promise<T> {
    const response = await fetch(
      method === "GET"
        ? `/api/admin/investor-corrections?email=${encodeURIComponent(email)}`
        : "/api/admin/investor-corrections",
      {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      }
    );
    const result = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Request failed.");
    return result;
  }

  async function search() {
    setBusy(true);
    try {
      const result = await call<{ investor: Investor | null }>("GET");
      setData(result.investor);
      setMessage(result.investor ? null : "No investor found.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function save(kind: "deposit" | "investment", id: string) {
    const amount = Number(amounts[id]);
    if (!reason.trim() || amount <= 0) {
      setMessage("Enter an amount and admin-only reason.");
      return;
    }

    setBusy(true);
    try {
      await call("PATCH", { kind, id, amount, reason });
      const result = await call<{ investor: Investor | null }>("GET");
      setData(result.investor);
      setMessage("Correction saved; withdrawals are held pending verification.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Correction failed");
    } finally {
      setBusy(false);
    }
  }

  async function allow() {
    if (!data) return;
    setBusy(true);
    try {
      const result = await call<{ withdrawalHold: WithdrawalHold }>("POST", {
        investorId: data.profile.id,
      });
      if (!result.withdrawalHold.is_withdrawal_allowed) {
        throw new Error("Withdrawal permission was not saved.");
      }
      setData((current) =>
        current ? { ...current, withdrawalHold: result.withdrawalHold } : current
      );
      setMessage("Withdrawals enabled and verified.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Release failed");
    } finally {
      setBusy(false);
    }
  }

  const rows = (kind: "deposit" | "investment", items: Item[]) =>
    items.map((item) => (
      <div
        key={item.id}
        className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_140px_160px]"
      >
        <div>
          <p className="font-medium">{item.label}</p>
          <p className="text-xs text-navy-500">
            {item.status} · {formatCurrency(item.amount)}
          </p>
        </div>
        <input
          className="rounded-md border px-3 py-2"
          type="number"
          placeholder={String(item.amount)}
          value={amounts[item.id] ?? ""}
          onChange={(event) =>
            setAmounts((current) => ({ ...current, [item.id]: event.target.value }))
          }
        />
        <Button disabled={busy} onClick={() => void save(kind, item.id)}>
          Save correction
        </Button>
      </div>
    ));

  const withdrawalsAllowed = data?.withdrawalHold?.is_withdrawal_allowed === true;

  return (
    <AdminFinanceShell
      title="Investor Financial Corrections"
      description="Corrections are audit logged and hold withdrawals until an administrator verifies the account."
    >
      <Card>
        <CardContent className="flex gap-3 p-5">
          <input
            className="flex-1 rounded-md border px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="investor@email.com"
          />
          <Button disabled={busy} onClick={() => void search()}>
            Search
          </Button>
        </CardContent>
      </Card>

      {data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {data.profile.full_name || "Investor"} · {data.profile.email}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="w-full rounded-md border p-3"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Admin-only correction reason"
              />
              <p className="text-sm text-navy-600">
                Withdrawal status: {withdrawalsAllowed ? "Allowed" : "Restricted"}
              </p>
              <Button
                variant="outline"
                disabled={busy || withdrawalsAllowed}
                onClick={() => void allow()}
              >
                {withdrawalsAllowed ? "Withdrawals allowed" : "Allow withdrawals"}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Deposits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">{rows("deposit", data.deposits)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pool investments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rows("investment", data.allocations)}
            </CardContent>
          </Card>
        </>
      ) : null}

      {message ? <p className="text-sm">{message}</p> : null}
    </AdminFinanceShell>
  );
}
