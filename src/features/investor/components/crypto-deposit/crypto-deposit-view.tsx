"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bitcoin, ChevronRight, Copy, CreditCard, Search, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import {
  CryptoFlowStep,
  cryptoFlowInputClass,
  cryptoFlowPrimaryButtonClass,
} from "@/features/investor/components/crypto-flow/crypto-flow-step";
import { RyvonxEmptyState, RyvonxPageHeader } from "@/features/investor/constants/ui";
import { WalletQrCode } from "@/features/investor/components/crypto-flow/wallet-qr-code";
import { cn, formatCurrency } from "@/lib/utils";
import { formatCryptoAmount } from "@/lib/crypto/usd-conversion";
import { useCryptoUsdPrices } from "@/hooks/use-crypto-usd-prices";
import type {
  CryptoDepositAsset,
  CryptoDepositNetwork,
  CryptoDepositPageData,
} from "@/features/investor/types/deposit";
import { MpesaDepositPanel } from "@/features/investor/components/mobile-payment/mpesa-deposit-panel";
import { CardDepositPanel } from "@/features/investor/components/card-deposit/card-deposit-panel";

interface CryptoDepositViewProps {
  data: CryptoDepositPageData;
}

const POPULAR_SYMBOLS = ["USDT", "USDC", "BNB", "BTC", "SOL"];

export function CryptoDepositView({ data }: CryptoDepositViewProps) {
  const router = useRouter();
  const mobilePayEnabled = data.mobilePayment.enabled;
  const [fundingMethod, setFundingMethod] = useState<"crypto" | "mobile" | "card" | null>(null);
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<CryptoDepositAsset | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<CryptoDepositNetwork | null>(null);
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.assets;
    return data.assets.filter(
      (a) =>
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.networks.some(
          (n) =>
            n.networkLabel.toLowerCase().includes(q) ||
            n.networkCode.toLowerCase().includes(q)
        )
    );
  }, [data.assets, search]);

  const popularAssets = useMemo(
    () =>
      POPULAR_SYMBOLS.map((sym) => data.assets.find((a) => a.symbol === sym)).filter(
        Boolean
      ) as CryptoDepositAsset[],
    [data.assets]
  );

  const minDepositUsd = data.cryptoMinimumDepositUsd;
  const parsedAmount = Number(amount);
  const amountValid =
    amount.trim() !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount >= minDepositUsd;

  const priceSymbols = useMemo(
    () => (selectedAsset ? [selectedAsset.symbol] : []),
    [selectedAsset]
  );
  const { cryptoEquivalent } = useCryptoUsdPrices(priceSymbols);
  const cryptoToSend =
    selectedAsset && amountValid
      ? cryptoEquivalent(parsedAmount, selectedAsset.symbol)
      : null;

  function selectAsset(asset: CryptoDepositAsset) {
    setSelectedAsset(asset);
    setSelectedNetwork(null);
    setAmount("");
    setTxHash("");
  }

  function selectNetwork(network: CryptoDepositNetwork) {
    setSelectedNetwork(network);
    setAmount("");
  }

  function resetCoin() {
    setSelectedAsset(null);
    setSelectedNetwork(null);
    setAmount("");
    setTxHash("");
  }

  function resetNetwork() {
    setSelectedNetwork(null);
    setAmount("");
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Address copied");
    } catch {
      toast.error("Could not copy address");
    }
  }

  async function handleMarkAsSent() {
    if (!selectedAsset || !selectedNetwork || !amount) return;

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a valid deposit amount");
      return;
    }
    if (parsed < minDepositUsd) {
      toast.error(`Minimum deposit is ${formatCurrency(minDepositUsd)}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/investor/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId: selectedNetwork.id,
          symbol: selectedAsset.symbol,
          networkCode: selectedNetwork.networkCode,
          amount: parsed,
          txHash: txHash.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Submission failed");

      toast.success("Deposit marked as sent", {
        description:
          "We'll verify your deposit. Once approved, choose a pool in the Marketplace.",
      });
      router.refresh();
      setAmount("");
      setTxHash("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <RyvonxPageHeader
        title="Deposit Funds"
        description={`${data.fundName} · Crypto minimum ${formatCurrency(data.cryptoMinimumDepositUsd)} · ${mobilePayEnabled ? "Choose how you want to fund your Ryvonx wallet." : "Deposit crypto directly to your Ryvonx wallet."}`}
      />

      <div className="mb-6 rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] px-5 py-4 shadow-[var(--id-shadow)]">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--id-text-muted)]">
          Funding Wallet balance
        </p>
        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--id-text)]">
          {formatCurrency(data.fundingWalletBalance)}
        </p>
        <p className="mt-1 text-xs text-[var(--id-text-secondary)]">
          Approved deposits credit this balance. Pending deposits appear below once submitted.
        </p>
      </div>

      {!fundingMethod ? (
        <section className="mb-8">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--id-accent-text)]">Fund your wallet</p><h2 className="mt-1 text-xl font-semibold text-[var(--id-text)]">Choose a payment method</h2></div>
            <p className="hidden text-sm text-[var(--id-text-muted)] sm:block">Secure deposits. One global balance.</p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button type="button" onClick={() => setFundingMethod("crypto")} className="group rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 text-left shadow-[var(--id-shadow)] transition hover:border-[var(--id-accent)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"><Bitcoin className="h-5 w-5" /></span>
              <span className="mt-4 block text-base font-semibold text-[var(--id-text)]">Deposit Crypto</span>
              <span className="mt-1 block text-sm leading-6 text-[var(--id-text-muted)]">Send supported crypto directly to the provided Ryvonx wallet address.</span>
              <span className="mt-4 flex items-center text-sm font-semibold text-[var(--id-accent-text)]">Continue with crypto <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </button>
            <button type="button" onClick={() => setFundingMethod("mobile")} className="group rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 text-left shadow-[var(--id-shadow)] transition hover:border-emerald-500">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><Smartphone className="h-5 w-5" /></span>
              <span className="mt-4 block text-base font-semibold text-[var(--id-text)]">Mobile Pay</span>
              <span className="mt-1 block text-sm leading-6 text-[var(--id-text-muted)]">Choose from regional mobile wallets available around the world.</span>
              <span className="mt-4 flex items-center text-sm font-semibold text-emerald-600">Continue with mobile pay <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </button>
            <button type="button" onClick={() => setFundingMethod("card")} className="group rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 text-left shadow-[var(--id-shadow)] transition hover:border-violet-500">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><CreditCard className="h-5 w-5" /></span>
              <span className="mt-4 block text-base font-semibold text-[var(--id-text)]">Credit or Debit Card</span>
              <span className="mt-1 block text-sm leading-6 text-[var(--id-text-muted)]">Use a Visa, Mastercard, or supported international card.</span>
              <span className="mt-4 flex items-center text-sm font-semibold text-violet-600">Continue with card <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </button>
          </div>
        </section>
      ) : (
        <button type="button" onClick={() => setFundingMethod(null)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--id-accent-text)] hover:underline"><ArrowLeft className="h-4 w-4" /> Change deposit method</button>
      )}

      {fundingMethod === "mobile" && (
        <MpesaDepositPanel config={data.mobilePayment} minimumUsd={data.mobilePayment.minimumDepositUsd} onCompleted={() => router.refresh()} />
      )}

      {fundingMethod === "card" && (
        <CardDepositPanel minimumUsd={data.minInvestment} />
      )}

      {fundingMethod === "crypto" && <div>
        <div className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow-lg)]">
          {/* Step 1 — Select Coin */}
          <CryptoFlowStep
            step={1}
            title="Select Coin"
            active={!selectedAsset}
            done={!!selectedAsset}
            summary={
              selectedAsset && (
                <div className="flex items-center gap-3">
                  <CoinIcon symbol={selectedAsset.symbol} color={selectedAsset.iconColor} />
                  <div>
                    <p className="text-sm font-semibold text-[var(--id-text)]">
                      {selectedAsset.symbol}
                    </p>
                    <p className="text-xs text-[var(--id-text-muted)]">
                      {selectedAsset.name}
                    </p>
                  </div>
                </div>
              )
            }
            summaryAction={
              selectedAsset && (
                <button
                  type="button"
                  onClick={resetCoin}
                  className="text-xs font-semibold text-[var(--id-accent-text)] hover:underline"
                >
                  Change
                </button>
              )
            }
          >
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--id-text-faint)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search coin"
                className={cn(cryptoFlowInputClass, "pl-10")}
              />
            </div>

            {popularAssets.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {popularAssets.map((asset) => (
                  <button
                    key={asset.symbol}
                    type="button"
                    onClick={() => selectAsset(asset)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      selectedAsset?.symbol === asset.symbol
                        ? "border-[var(--id-accent)] bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"
                        : "border-[var(--id-border)] bg-[var(--id-surface-muted)] text-[var(--id-text-secondary)] hover:border-[var(--id-border-strong)]"
                    )}
                  >
                    {asset.symbol}
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-1">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.symbol}
                  type="button"
                  onClick={() => selectAsset(asset)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--id-surface-hover)]",
                    selectedAsset?.symbol === asset.symbol &&
                      "bg-[var(--id-surface-elevated)] ring-1 ring-[var(--id-accent)]/30"
                  )}
                >
                  <CoinIcon symbol={asset.symbol} color={asset.iconColor} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--id-text)]">
                      {asset.symbol}
                    </p>
                    <p className="text-xs text-[var(--id-text-muted)]">{asset.name}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--id-text-faint)]" />
                </button>
              ))}
            </div>
          </CryptoFlowStep>

          {/* Step 2 — Select Network */}
          <CryptoFlowStep
            step={2}
            title="Select Network"
            active={!!selectedAsset && !selectedNetwork}
            done={!!selectedNetwork}
            disabled={!selectedAsset}
            summary={
              selectedNetwork && selectedAsset && (
                <p className="text-sm font-medium text-[var(--id-text)]">
                  {selectedNetwork.networkLabel}
                </p>
              )
            }
            summaryAction={
              selectedNetwork && (
                <button
                  type="button"
                  onClick={resetNetwork}
                  className="text-xs font-semibold text-[var(--id-accent-text)] hover:underline"
                >
                  Change
                </button>
              )
            }
          >
            {selectedAsset && (
              <div className="space-y-2">
                <p className="text-xs text-[var(--id-text-muted)]">
                  Only send funds using the selected network.
                </p>
                {selectedAsset.networks.map((network) => (
                  <button
                    key={network.id}
                    type="button"
                    onClick={() => selectNetwork(network)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                      selectedNetwork?.id === network.id
                        ? "border-[var(--id-accent)] bg-[var(--id-accent-soft)]"
                        : "border-[var(--id-border)] bg-[var(--id-surface-muted)] hover:bg-[var(--id-surface-hover)]"
                    )}
                  >
                    <span className="text-sm font-semibold text-[var(--id-text)]">
                      {network.networkLabel}
                    </span>
                    <span className="text-xs text-[var(--id-text-muted)]">
                      Min {formatCurrency(minDepositUsd)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CryptoFlowStep>

          {/* Step 3 — Deposit Address + QR */}
          <CryptoFlowStep
            step={3}
            title="Deposit Address"
            active={!!selectedNetwork}
            done={!!selectedNetwork}
            disabled={!selectedNetwork}
          >
            {selectedAsset && selectedNetwork && (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-[var(--id-text-secondary)]">
                  Send only{" "}
                  <span className="font-semibold text-[var(--id-text)]">
                    {selectedAsset.symbol}
                  </span>{" "}
                  on{" "}
                  <span className="font-semibold text-[var(--id-text)]">
                    {selectedNetwork.networkLabel}
                  </span>
                  . Wrong network transfers may be lost.
                </div>

                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <WalletQrCode value={selectedNetwork.walletAddress} />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4">
                      <p className="break-all font-mono text-xs leading-relaxed text-[var(--id-text)] sm:text-sm">
                        {selectedNetwork.walletAddress}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-3 h-8 px-2 text-[var(--id-accent-text)] hover:bg-[var(--id-surface-hover)]"
                        onClick={() => handleCopy(selectedNetwork.walletAddress)}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy address
                      </Button>
                    </div>
                    <p className="text-xs text-[var(--id-text-muted)]">
                      Minimum deposit: {formatCurrency(minDepositUsd)} USD
                      {cryptoToSend != null && (
                        <>
                          {" "}
                          · Send approximately{" "}
                          <span className="font-medium text-[var(--id-text)]">
                            {formatCryptoAmount(cryptoToSend, selectedAsset.symbol)}{" "}
                            {selectedAsset.symbol}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CryptoFlowStep>

          {/* Step 4 — Deposit Amount */}
          <CryptoFlowStep
            step={4}
            title="Deposit Amount"
            active={!!selectedNetwork}
            done={amountValid}
            disabled={!selectedNetwork}
          >
            {selectedAsset && selectedNetwork && (
              <div className="space-y-3">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--id-text-muted)]">
                    $
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount in USD"
                    className={cn(cryptoFlowInputClass, "pl-8")}
                  />
                </div>
                {amountValid && cryptoToSend != null && (
                  <p className="text-xs text-[var(--id-text-muted)]">
                    Send approximately{" "}
                    <span className="font-semibold text-[var(--id-text)]">
                      {formatCryptoAmount(cryptoToSend, selectedAsset.symbol)} {selectedAsset.symbol}
                    </span>{" "}
                    ({formatCurrency(parsedAmount)} USD)
                  </p>
                )}
                {amount.trim() !== "" && !amountValid && (
                  <p className="text-xs text-amber-500">
                    Enter at least {formatCurrency(minDepositUsd)}
                  </p>
                )}
              </div>
            )}
          </CryptoFlowStep>

          {/* Step 5 — Mark As Sent */}
          <CryptoFlowStep
            step={5}
            title="Mark As Sent"
            active={!!selectedNetwork}
            done={false}
            disabled={!selectedNetwork}
            isLast
          >
            {selectedAsset && selectedNetwork && (
              <div className="space-y-4">
                <Input
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Transaction hash (optional)"
                  className={cryptoFlowInputClass}
                />
                <p className="text-xs leading-relaxed text-[var(--id-text-muted)]">
                  After sending crypto, confirm here. Our team will verify and credit your
                  balance. Then invest in a pool via{" "}
                  <Link
                    href={ROUTES.marketplace}
                    className="font-medium text-[var(--id-accent-text)] hover:underline"
                  >
                    Marketplace / Pools
                  </Link>
                  .
                </p>
                <Button
                  className={cryptoFlowPrimaryButtonClass}
                  disabled={submitting || !amountValid}
                  onClick={handleMarkAsSent}
                >
                  {submitting ? "Submitting…" : "Mark As Sent"}
                </Button>
              </div>
            )}
          </CryptoFlowStep>
        </div>

      </div>}

      <section className="mt-8 overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--id-border)] px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-[var(--id-text)]">Recent Deposits</h2>
          <Link
            href={ROUTES.transactions}
            className="text-sm font-medium text-[var(--id-accent-text)] hover:underline"
          >
            More
          </Link>
        </div>

        {data.recentDeposits.length === 0 ? (
          <RyvonxEmptyState
            title="No deposits yet"
            description="Complete a deposit above and it will appear in your history."
            className="mx-5 my-6 border-none bg-transparent shadow-none sm:mx-6"
          />
        ) : (
          <ul className="divide-y divide-[var(--id-border)]">
            {data.recentDeposits.map((dep) => (
              <li key={dep.id}>
                <Link
                  href={ROUTES.transactionDetail(dep.id)}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--id-surface-hover)] sm:px-6"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--id-text)]">Deposit</p>
                    <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">
                      {dep.paymentMethod === "mpesa" ? "M-Pesa · Mobile Pay" : `${dep.symbol} • ${dep.network}`}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--id-text-faint)]">
                      {new Date(dep.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold tabular-nums text-[var(--id-success)]">
                      +{formatCurrency(dep.amount)}
                    </p>
                    {dep.cryptoAmount != null && dep.cryptoAmount > 0 && (
                      <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">
                        ≈ {formatCryptoAmount(dep.cryptoAmount, dep.symbol)} {dep.symbol}
                      </p>
                    )}
                    {dep.paymentMethod === "mpesa" && dep.kesAmount != null && (
                      <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">
                        Paid KES {dep.kesAmount.toLocaleString()}
                      </p>
                    )}
                    <StatusPill status={dep.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CoinIcon({ symbol, color }: { symbol: string; color: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      {symbol.slice(0, 1)}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "text-[var(--id-success)]",
    approved: "text-[var(--id-success)]",
    pending: "text-amber-500",
    rejected: "text-[var(--id-danger)]",
    cancelled: "text-[var(--id-text-faint)]",
  };

  return (
    <span
      className={cn(
        "text-xs font-semibold capitalize",
        styles[status] ?? "text-[var(--id-text-muted)]"
      )}
    >
      {status === "approved" ? "Completed" : status}
    </span>
  );
}
