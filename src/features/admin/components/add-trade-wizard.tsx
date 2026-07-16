"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminFund } from "@/features/admin/types";
import type { PoolMemberOption } from "@/services/trade-admin.service";
import { TradeScreenshotField } from "@/features/admin/components/trade-screenshot-field";
import { resolveTradeScreenshotUrl } from "@/lib/storage/trade-screenshots";

const INVESTOR_STATUS_OPTIONS = [
  { value: "running", label: "Running" },
  { value: "breakeven", label: "Breakeven" },
  { value: "partials_taken", label: "Partials taken" },
  { value: "take_profit_hit", label: "Take profit hit" },
  { value: "stop_loss_hit", label: "Stop loss hit" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

type WizardStep = "pool" | "details" | "screenshot";

interface TradeFormState {
  fundId: string;
  distributionMode: "pool" | "individual";
  targetUserId: string;
  symbol: string;
  direction: "long" | "short";
  entryPrice: string;
  exitPrice: string;
  currentPrice: string;
  quantity: string;
  investedAmount: string;
  totalProfit: string;
  status: "open" | "closed" | "cancelled";
  investorStatus: string;
  notes: string;
  screenshotUrl: string;
}

const INITIAL_FORM: TradeFormState = {
  fundId: "",
  distributionMode: "pool",
  targetUserId: "",
  symbol: "",
  direction: "long",
  entryPrice: "",
  exitPrice: "",
  currentPrice: "",
  quantity: "1",
  investedAmount: "",
  totalProfit: "",
  status: "open",
  investorStatus: "running",
  notes: "",
  screenshotUrl: "",
};

const STEP_LABELS: Record<WizardStep, string> = {
  pool: "Select pool",
  details: "Trade details",
  screenshot: "Screenshot",
};

export function AddTradeWizard({ funds }: { funds: AdminFund[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("pool");
  const [form, setForm] = useState<TradeFormState>(INITIAL_FORM);
  const [members, setMembers] = useState<PoolMemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const activeFunds = funds.filter((f) => f.status === "active");
  const selectedFund = activeFunds.find((f) => f.id === form.fundId);

  useEffect(() => {
    if (!form.fundId) {
      setMembers([]);
      return;
    }

    let cancelled = false;
    setLoadingMembers(true);

    fetch(`/api/admin/trades/pool-members/${form.fundId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load members");
        if (!cancelled) setMembers(data.members ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setMembers([]);
          toast.error(err instanceof Error ? err.message : "Failed to load pool members");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMembers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.fundId]);

  function resetWizard() {
    setStep("pool");
    setForm(INITIAL_FORM);
    setMembers([]);
    setScreenshotFile(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetWizard();
  }

  function updateForm<K extends keyof TradeFormState>(key: K, value: TradeFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validatePoolStep(): boolean {
    if (!form.fundId) {
      toast.error("Select which pool is being updated.");
      return false;
    }
    if (loadingMembers) {
      toast.error("Loading pool members…");
      return false;
    }
    if (members.length === 0) {
      toast.error("This pool has no investors yet. Add members before recording a trade.");
      return false;
    }
    if (form.distributionMode === "individual" && !form.targetUserId) {
      toast.error("Select the investor receiving this profit.");
      return false;
    }
    return true;
  }

  function validateDetailsStep(): boolean {
    if (!form.symbol.trim()) {
      toast.error("Enter the trading pair (e.g. EUR/USD).");
      return false;
    }
    if (!form.investedAmount || Number(form.investedAmount) <= 0) {
      toast.error("Enter the invested amount.");
      return false;
    }
    if (!form.entryPrice || Number(form.entryPrice) <= 0) {
      toast.error("Enter a valid entry price.");
      return false;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      toast.error("Enter a valid quantity.");
      return false;
    }
    if (form.totalProfit === "" || Number.isNaN(Number(form.totalProfit))) {
      toast.error("Enter the total profit or loss for this trade.");
      return false;
    }
    if (form.status === "closed" && !form.exitPrice && !form.currentPrice) {
      toast.error("Enter an exit or current price for closed trades.");
      return false;
    }
    return true;
  }

  function goNext() {
    if (step === "pool" && !validatePoolStep()) return;
    if (step === "details" && !validateDetailsStep()) return;
    if (step === "pool") setStep("details");
    else if (step === "details") setStep("screenshot");
  }

  function goBack() {
    if (step === "details") setStep("pool");
    else if (step === "screenshot") setStep("details");
  }

  async function submitTrade() {
    if (!validatePoolStep() || !validateDetailsStep()) return;

    setSaving(true);
    try {
      const screenshotUrl = await resolveTradeScreenshotUrl({
        file: screenshotFile,
        url: form.screenshotUrl,
      });

      const res = await fetch("/api/admin/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId: form.fundId,
          distributionMode: form.distributionMode,
          targetUserId:
            form.distributionMode === "individual" ? form.targetUserId : undefined,
          symbol: form.symbol.trim(),
          direction: form.direction,
          entryPrice: Number(form.entryPrice),
          exitPrice: form.exitPrice ? Number(form.exitPrice) : null,
          currentPrice: form.currentPrice ? Number(form.currentPrice) : null,
          quantity: Number(form.quantity),
          investedAmount: Number(form.investedAmount),
          totalProfit: Number(form.totalProfit),
          status: form.status,
          investorStatus: form.investorStatus,
          notes: form.notes.trim() || undefined,
          screenshotUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create trade");

      toast.success(
        form.distributionMode === "pool"
          ? "Trade added and profit split across pool members"
          : "Trade added and profit allocated to investor"
      );
      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create trade");
    } finally {
      setSaving(false);
    }
  }

  const stepIndex = step === "pool" ? 0 : step === "details" ? 1 : 2;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Trade
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add trade</DialogTitle>
            <DialogDescription>
              Step {stepIndex + 1} of 3 — {STEP_LABELS[step]}
            </DialogDescription>
          </DialogHeader>

          {step === "pool" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  Which pool is being updated?
                </label>
                <Select value={form.fundId} onValueChange={(v) => updateForm("fundId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a pool" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeFunds.map((fund) => (
                      <SelectItem key={fund.id} value={fund.id}>
                        {fund.name}
                        {fund.tradingPair ? ` · ${fund.tradingPair}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFund && (
                <p className="text-xs text-navy-500">
                  {loadingMembers
                    ? "Loading pool members…"
                    : `${members.length} investor${members.length === 1 ? "" : "s"} in this pool`}
                </p>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  Profit distribution
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateForm("distributionMode", "pool")}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      form.distributionMode === "pool"
                        ? "border-navy-900 bg-navy-50"
                        : "border-border hover:bg-surface-1"
                    }`}
                  >
                    <span className="font-medium">Entire pool</span>
                    <p className="mt-0.5 text-xs text-navy-500">
                      Split total profit across all members by investment share
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateForm("distributionMode", "individual")}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      form.distributionMode === "individual"
                        ? "border-navy-900 bg-navy-50"
                        : "border-border hover:bg-surface-1"
                    }`}
                  >
                    <span className="font-medium">Individual investor</span>
                    <p className="mt-0.5 text-xs text-navy-500">
                      Assign the full profit to one trader in this pool
                    </p>
                  </button>
                </div>
              </div>

              {form.distributionMode === "individual" && form.fundId && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-navy-800">
                    Select investor
                  </label>
                  <Select
                    value={form.targetUserId}
                    onValueChange={(v) => updateForm("targetUserId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose investor" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.fullName} · ${member.totalInvested.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {step === "details" && (
            <div className="space-y-3">
              <p className="text-xs text-navy-500">
                Pool: <span className="font-medium text-navy-800">{selectedFund?.name}</span>
                {" · "}
                {form.distributionMode === "pool"
                  ? "Profit split across all members"
                  : `Profit to ${members.find((m) => m.userId === form.targetUserId)?.fullName ?? "selected investor"}`}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-navy-700">Pair</label>
                  <Input
                    placeholder="EUR/USD"
                    value={form.symbol}
                    onChange={(e) => updateForm("symbol", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-navy-700">Direction</label>
                  <Select
                    value={form.direction}
                    onValueChange={(v) => updateForm("direction", v as "long" | "short")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-navy-700">Status</label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => {
                      updateForm("status", v as TradeFormState["status"]);
                      if (v === "closed") updateForm("investorStatus", "closed");
                      else if (v === "cancelled") updateForm("investorStatus", "cancelled");
                      else if (form.investorStatus === "closed" || form.investorStatus === "cancelled") {
                        updateForm("investorStatus", "running");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open / Running</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-navy-700">
                    Invested amount ($)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="10000"
                    value={form.investedAmount}
                    onChange={(e) => updateForm("investedAmount", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-navy-700">
                    Total profit / loss ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="500 or -120"
                    value={form.totalProfit}
                    onChange={(e) => updateForm("totalProfit", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-navy-700">Entry price</label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={form.entryPrice}
                    onChange={(e) => updateForm("entryPrice", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-navy-700">
                    {form.status === "closed" ? "Exit price" : "Current price"}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={form.status === "closed" ? form.exitPrice : form.currentPrice}
                    onChange={(e) =>
                      form.status === "closed"
                        ? updateForm("exitPrice", e.target.value)
                        : updateForm("currentPrice", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-navy-700">Quantity</label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={form.quantity}
                    onChange={(e) => updateForm("quantity", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-navy-700">
                    Investor display status
                  </label>
                  <Select
                    value={form.investorStatus}
                    onValueChange={(v) => updateForm("investorStatus", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVESTOR_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-navy-700">
                    Notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => updateForm("notes", e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Strategy notes, session context…"
                  />
                </div>
              </div>
            </div>
          )}

          {step === "screenshot" && (
            <div className="space-y-3">
              <p className="text-sm text-navy-600">
                Upload a TradingView screenshot or paste a share URL. Investors will see it on
                their trades page.
              </p>
              <TradeScreenshotField
                url={form.screenshotUrl}
                onUrlChange={(v) => updateForm("screenshotUrl", v)}
                file={screenshotFile}
                onFileChange={setScreenshotFile}
                disabled={saving}
              />
              <p className="text-xs text-navy-500">
                You can also add or update the screenshot later from the trades table.
              </p>
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === "pool" || saving}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {step === "screenshot" ? (
              <Button type="button" onClick={submitTrade} disabled={saving}>
                {saving ? "Saving…" : "Create trade"}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
