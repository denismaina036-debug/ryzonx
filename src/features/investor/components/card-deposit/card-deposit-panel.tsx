"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, CreditCard, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";

export function CardDepositPanel({
  minimumUsd,
}: {
  minimumUsd: number;
}) {
  const [processing, setProcessing] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [amount, setAmount] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProcessing(true);
    setDeclined(false);
    await new Promise((resolve) => window.setTimeout(resolve, 1400));
    setProcessing(false);
    setDeclined(true);
  }

  const amountValue = Number(amount);
  const amountValid = Number.isFinite(amountValue) && amountValue >= minimumUsd;

  return (
    <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow-lg)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--id-border)] px-5 py-5 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--id-accent-text)]">Card payment</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--id-text)]">Credit or debit card</h2>
          <p className="mt-1 text-sm text-[var(--id-text-muted)]">Enter your billing information to fund your USD wallet.</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"><CreditCard className="h-5 w-5" /></span>
      </div>

      <form onSubmit={submit} className="space-y-6 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Deposit amount (USD)" className="sm:col-span-2">
            <Input required type="number" min={minimumUsd} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={String(minimumUsd)} />
            {amount && !amountValid && <span className="mt-1 block text-xs text-amber-600">Minimum {formatCurrency(minimumUsd)}</span>}
          </Field>
          <Field label="Name on card" className="sm:col-span-2"><Input required autoComplete="cc-name" placeholder="Full name" /></Field>
          <Field label="Card number" className="sm:col-span-2"><Input required autoComplete="cc-number" inputMode="numeric" maxLength={19} placeholder="1234 5678 9012 3456" /></Field>
          <Field label="Expiry date"><Input required autoComplete="cc-exp" inputMode="numeric" placeholder="MM / YY" /></Field>
          <Field label="Security code"><Input required autoComplete="cc-csc" inputMode="numeric" maxLength={4} placeholder="CVV" type="password" /></Field>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[var(--id-text)]">Billing address</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Country or region" className="sm:col-span-2"><Input required autoComplete="country-name" placeholder="Country" /></Field>
            <Field label="Street address" className="sm:col-span-2"><Input required autoComplete="street-address" placeholder="Address line" /></Field>
            <Field label="City"><Input required autoComplete="address-level2" placeholder="City" /></Field>
            <Field label="State / province"><Input required autoComplete="address-level1" placeholder="State or province" /></Field>
            <Field label="Postal code / P.O. Box" className="sm:col-span-2"><Input required autoComplete="postal-code" placeholder="Postal code or P.O. Box" /></Field>
          </div>
        </div>

        {declined && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div><p className="text-sm font-semibold text-red-700 dark:text-red-400">Card declined</p><p className="mt-1 text-xs leading-5 text-[var(--id-text-muted)]">We could not authorize this card. Please choose another payment method.</p></div>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={!amountValid || processing}>
          {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Authorizing card…</> : <>Pay {amountValid ? formatCurrency(amountValue) : "securely"}</>}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[var(--id-text-faint)]"><LockKeyhole className="h-3.5 w-3.5" /> Card information is not stored while card payments are unavailable.</p>
      </form>
    </section>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return <label className={cn("text-sm font-medium text-[var(--id-text-secondary)]", className)}>{label}<div className="mt-2">{children}</div></label>;
}
