"use client";

import { useState } from "react";
import { ArrowLeft, Bitcoin, ChevronRight, Smartphone } from "lucide-react";
import { MpesaDepositPanel } from "@/features/investor/components/mobile-payment/mpesa-deposit-panel";
import { formatCurrency } from "@/lib/utils";

export function MobilePayPreview() {
  const [method, setMethod] = useState<"mobile" | "crypto" | null>(null);

  return (
    <main className="min-h-screen bg-[var(--id-page)] px-4 py-10 text-[var(--id-text)]">
      <div className="mx-auto max-w-[1200px]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--id-accent-text)]">Development preview · no payments can be sent</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--id-text)]">Deposit Funds</h1>
        <p className="mt-2 text-sm text-[var(--id-text-muted)]">RyvonX Funding Wallet · Minimum deposit {formatCurrency(100)} · Choose how you want to fund your wallet.</p>

        <div className="my-6 rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] px-5 py-4 shadow-[var(--id-shadow)]">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--id-text-muted)]">Funding Wallet balance</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--id-text)]">$2,450.00</p>
          <p className="mt-1 text-xs text-[var(--id-text-secondary)]">Preview balance only</p>
        </div>

        {!method ? (
          <section>
            <h2 className="text-base font-semibold text-[var(--id-text)]">Choose a deposit method</h2>
            <p className="mt-1 text-sm text-[var(--id-text-muted)]">Both methods credit the same USD Funding Wallet after confirmation.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <button type="button" onClick={() => setMethod("crypto")} className="group rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 text-left shadow-[var(--id-shadow)] transition hover:border-[var(--id-accent)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"><Bitcoin className="h-5 w-5" /></span>
                <span className="mt-4 block text-base font-semibold text-[var(--id-text)]">Deposit Crypto</span>
                <span className="mt-1 block text-sm leading-6 text-[var(--id-text-muted)]">Send supported crypto directly to the provided Ryvonx wallet address.</span>
                <span className="mt-4 flex items-center text-sm font-semibold text-[var(--id-accent-text)]">Continue with crypto <ChevronRight className="ml-1 h-4 w-4" /></span>
              </button>
              <button type="button" onClick={() => setMethod("mobile")} className="group rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 text-left shadow-[var(--id-shadow)] transition hover:border-emerald-500">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><Smartphone className="h-5 w-5" /></span>
                <span className="mt-4 block text-base font-semibold text-[var(--id-text)]">Mobile Pay</span>
                <span className="mt-1 block text-sm leading-6 text-[var(--id-text-muted)]">Pay from your phone using M-Pesa STK Push. Airtel Money is coming soon.</span>
                <span className="mt-4 flex items-center text-sm font-semibold text-emerald-600">Continue with mobile pay <ChevronRight className="ml-1 h-4 w-4" /></span>
              </button>
            </div>
          </section>
        ) : method === "mobile" ? (
          <section>
            <button type="button" onClick={() => setMethod(null)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--id-accent-text)] hover:underline"><ArrowLeft className="h-4 w-4" /> Change deposit method</button>
            <MpesaDepositPanel
              config={{
              enabled: true,
              providerConfigured: false,
              kesPerUsd: 130,
              minimumDepositUsd: 100,
                methods: [
                  { id: "mpesa", name: "M-Pesa", active: true, description: "Secure STK push to your phone" },
                  { id: "airtel_money", name: "Airtel Money", active: false, description: "Mobile wallet payment" },
                  { id: "mtn_momo", name: "MTN MoMo", active: false, description: "Mobile money payment" },
                  { id: "orange_money", name: "Orange Money", active: false, description: "Mobile wallet payment" },
                ],
              }}
              minimumUsd={100}
              onCompleted={() => undefined}
            />
          </section>
        ) : (
          <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-6">
            <button type="button" onClick={() => setMethod(null)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--id-accent-text)] hover:underline"><ArrowLeft className="h-4 w-4" /> Change deposit method</button>
            <h2 className="text-lg font-semibold text-[var(--id-text)]">Existing crypto flow</h2>
            <p className="mt-2 text-sm text-[var(--id-text-muted)]">The current coin, network, wallet address, amount, and “Mark As Sent” experience remains unchanged here.</p>
          </section>
        )}
      </div>
    </main>
  );
}
