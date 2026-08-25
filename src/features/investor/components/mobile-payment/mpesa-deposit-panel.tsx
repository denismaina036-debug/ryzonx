"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  MobilePaymentConfig,
  MobilePaymentIntentResponse,
  MobilePaymentStatusResponse,
} from "@/features/investor/types/mobile-payment";

type Props = {
  config: MobilePaymentConfig;
  minimumUsd: number;
  onCompleted: () => void;
};

export function MpesaDepositPanel({ config, minimumUsd, onCompleted }: Props) {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [intent, setIntent] = useState<MobilePaymentIntentResponse | null>(null);
  const [status, setStatus] = useState<MobilePaymentStatusResponse | null>(null);
  const completedRef = useRef(false);

  const amountUsd = Number(amount);
  const validAmount = Number.isFinite(amountUsd) && amountUsd >= minimumUsd;
  const quoteKes = useMemo(
    () => validAmount && config.kesPerUsd ? Math.round(amountUsd * config.kesPerUsd) : null,
    [amountUsd, config.kesPerUsd, validAmount]
  );

  useEffect(() => {
    if (!intent || !["prompt_sent", "processing"].includes(status?.status ?? intent.status)) return;
    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/investor/mobile-payments/${intent.id}?refresh=true`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not check payment status.");
        if (cancelled) return;
        const next = body as MobilePaymentStatusResponse;
        setStatus(next);
        if (next.status === "completed" && !completedRef.current) {
          completedRef.current = true;
          toast.success("M-Pesa deposit completed", { description: `${formatCurrency(next.usdAmount)} was added to your Funding Wallet.` });
          onCompleted();
        }
      } catch (error) {
        if (attempts === 1) toast.error(error instanceof Error ? error.message : "Status check failed");
      }
    };

    const timer = window.setInterval(() => {
      if (attempts >= 20) window.clearInterval(timer);
      else void check();
    }, 6_000);
    void check();
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [intent, onCompleted, status?.status]);

  async function startPayment() {
    if (!validAmount || !phone.trim()) return;
    setSubmitting(true);
    setIntent(null);
    setStatus(null);
    completedRef.current = false;
    try {
      const response = await fetch("/api/investor/mobile-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "mpesa", amountUsd, phone }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not send the M-Pesa prompt.");
      setIntent(body as MobilePaymentIntentResponse);
      toast.success("STK prompt sent", { description: "Check your phone and enter your M-Pesa PIN." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment request failed");
    } finally {
      setSubmitting(false);
    }
  }

  const currentStatus = status?.status ?? intent?.status;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow-lg)]">
        <div className="border-b border-[var(--id-border)] px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--id-accent-text)]">Mobile Pay</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--id-text)]">Choose a mobile payment method</h2>
        </div>

        <div className="grid gap-3 border-b border-[var(--id-border)] p-5 sm:grid-cols-2 sm:p-6">
          <button type="button" className="flex items-center gap-3 rounded-xl border border-[var(--id-accent)] bg-[var(--id-accent-soft)] p-4 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white"><Smartphone className="h-5 w-5" /></span>
            <span><span className="block text-sm font-semibold text-[var(--id-text)]">M-Pesa</span><span className="text-xs text-[var(--id-text-muted)]">Available · STK Push</span></span>
          </button>
          <button type="button" disabled className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4 text-left opacity-60">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white"><Smartphone className="h-5 w-5" /></span>
            <span><span className="block text-sm font-semibold text-[var(--id-text)]">Airtel Money</span><span className="text-xs text-[var(--id-text-muted)]">Coming soon</span></span>
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div><p className="text-sm font-semibold text-[var(--id-text)]">Pay securely to RYVONX</p><p className="mt-1 text-xs leading-5 text-[var(--id-text-muted)]">We send a payment prompt to your phone. Enter your M-Pesa PIN only inside the official phone prompt—never on Ryvonx.</p></div>
            </div>
          </div>

          {!config.providerConfigured && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
              M-Pesa preview is ready. Merchant email and the KES conversion rate must be configured before requests can be sent.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-[var(--id-text-secondary)]">Deposit amount (USD)
              <div className="relative mt-2"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--id-text-muted)]">$</span><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={String(minimumUsd)} className="pl-8" disabled={!!intent && !["failed", "cancelled", "expired"].includes(currentStatus ?? "")} /></div>
              {amount && !validAmount && <span className="mt-1 block text-xs text-amber-600">Minimum {formatCurrency(minimumUsd)}</span>}
            </label>
            <label className="text-sm font-medium text-[var(--id-text-secondary)]">M-Pesa phone number
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="0712 345 678" className="mt-2" disabled={!!intent && !["failed", "cancelled", "expired"].includes(currentStatus ?? "")} />
            </label>
          </div>

          {quoteKes != null && (
            <div className="flex items-center justify-between rounded-xl bg-[var(--id-surface-muted)] px-4 py-3">
              <div><p className="text-xs text-[var(--id-text-muted)]">You will receive</p><p className="font-mono text-sm font-semibold text-[var(--id-text)]">{formatCurrency(amountUsd)} USD</p></div>
              <div className="text-right"><p className="text-xs text-[var(--id-text-muted)]">M-Pesa charge</p><p className="font-mono text-base font-semibold text-[var(--id-text)]">KES {quoteKes.toLocaleString()}</p></div>
            </div>
          )}

          {!intent ? (
            <Button type="button" variant="success" size="lg" className="w-full" onClick={startPayment} disabled={!config.providerConfigured || !validAmount || !phone.trim()} isLoading={submitting}>
              Send M-Pesa prompt
            </Button>
          ) : (
            <PaymentProgress intent={intent} status={status} />
          )}

          <p className="text-center text-xs text-[var(--id-text-faint)]">The displayed KES quote is locked for this payment request. Your Funding Wallet is credited only after provider verification.</p>
        </div>
      </section>

      <aside className="h-fit rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 shadow-[var(--id-shadow)]">
        <h2 className="text-sm font-semibold text-[var(--id-text)]">How M-Pesa works</h2>
        <ol className="mt-4 space-y-4">
          {["Enter your amount and M-Pesa number", "Confirm the STK prompt on your phone", "Ryvonx verifies payment and credits your wallet"].map((item, index) => (
            <li key={item} className="flex gap-3 text-sm text-[var(--id-text-secondary)]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--id-accent-soft)] text-xs font-semibold text-[var(--id-accent-text)]">{index + 1}</span><span>{item}</span></li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function PaymentProgress({ intent, status }: { intent: MobilePaymentIntentResponse; status: MobilePaymentStatusResponse | null }) {
  const current = status?.status ?? intent.status;
  const complete = current === "completed";
  const failed = ["failed", "cancelled", "expired"].includes(current);
  return (
    <div className={cn("rounded-xl border p-4", complete ? "border-emerald-500/25 bg-emerald-500/5" : failed ? "border-red-500/25 bg-red-500/5" : "border-[var(--id-accent)]/25 bg-[var(--id-accent-soft)]")}>
      <div className="flex items-start gap-3">
        {complete ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : failed ? <Clock3 className="h-5 w-5 text-red-600" /> : <Loader2 className="h-5 w-5 animate-spin text-[var(--id-accent-text)]" />}
        <div><p className="text-sm font-semibold text-[var(--id-text)]">{complete ? "Payment completed" : failed ? "Payment not completed" : "Waiting for M-Pesa confirmation"}</p><p className="mt-1 text-xs leading-5 text-[var(--id-text-muted)]">{status?.responseDescription ?? intent.message}</p><p className="mt-2 font-mono text-xs text-[var(--id-text-faint)]">{intent.reference}{status?.receipt ? ` · Receipt ${status.receipt}` : ""}</p></div>
      </div>
    </div>
  );
}

