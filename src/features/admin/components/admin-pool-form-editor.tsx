"use client";

import { Input } from "@/components/ui/input";

export interface PoolFormFields {
  name: string;
  description: string;
  poolDescription: string;
  tradingPair: string;
  poolDurationDays: string;
  minInvestment: string;
  maxInvestment: string;
  targetCapital: string;
  profitTargetPct: string;
  targetInvestors: string;
  isInviteOnly: boolean;
  cardBackgroundColor: string;
  poolManagerName: string;
  poolManagerIconUrl: string;
  additionalCapital: string;
}

export const EMPTY_POOL_FORM: PoolFormFields = {
  name: "",
  description: "",
  poolDescription: "",
  tradingPair: "EUR/USD",
  poolDurationDays: "90",
  minInvestment: "100",
  maxInvestment: "",
  targetCapital: "1000000",
  profitTargetPct: "15",
  targetInvestors: "100",
  isInviteOnly: false,
  cardBackgroundColor: "#0f1623",
  poolManagerName: "",
  poolManagerIconUrl: "",
  additionalCapital: "",
};

interface PoolFormEditorProps {
  form: PoolFormFields;
  onChange: (form: PoolFormFields) => void;
  showAdditionalCapital?: boolean;
  currentCapital?: number;
}

export function AdminPoolFormEditor({
  form,
  onChange,
  showAdditionalCapital = false,
  currentCapital,
}: PoolFormEditorProps) {
  function update<K extends keyof PoolFormFields>(key: K, value: PoolFormFields[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Input
        placeholder="Pool name"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
      />
      <Input
        placeholder="Trading pair (e.g. EUR/USD)"
        value={form.tradingPair}
        onChange={(e) => update("tradingPair", e.target.value)}
      />
      <Input
        placeholder="Short description"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        className="sm:col-span-2"
      />
      <textarea
        placeholder="Pool description — strategy, timing, news events, pairs…"
        value={form.poolDescription}
        onChange={(e) => update("poolDescription", e.target.value)}
        rows={3}
        className="sm:col-span-2 w-full rounded-md border px-3 py-2 text-sm"
      />
      <Input
        placeholder="Duration (days)"
        value={form.poolDurationDays}
        onChange={(e) => update("poolDurationDays", e.target.value)}
      />
      <Input
        placeholder="Min deposit"
        value={form.minInvestment}
        onChange={(e) => update("minInvestment", e.target.value)}
      />
      <Input
        placeholder="Max deposit (optional)"
        value={form.maxInvestment}
        onChange={(e) => update("maxInvestment", e.target.value)}
      />
      <Input
        placeholder="Target capital"
        value={form.targetCapital}
        onChange={(e) => update("targetCapital", e.target.value)}
      />
      <Input
        placeholder="Profit target %"
        value={form.profitTargetPct}
        onChange={(e) => update("profitTargetPct", e.target.value)}
      />
      <Input
        placeholder="Target investors"
        value={form.targetInvestors}
        onChange={(e) => update("targetInvestors", e.target.value)}
      />

      <div className="sm:col-span-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        ROI targets are configured by Pool Managers using platform investment levels and ROI
        multipliers. Use Investment Levels in admin settings to manage global tiers.
      </div>

      {showAdditionalCapital && (
        <div className="sm:col-span-2 rounded-lg border border-dashed p-3">
          <p className="text-sm font-medium">Raised capital</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Current raised: ${(currentCapital ?? 0).toLocaleString()}. Add seed capital without
            changing investor participation logic.
          </p>
          <Input
            className="mt-2"
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount to add to raised capital"
            value={form.additionalCapital}
            onChange={(e) => update("additionalCapital", e.target.value)}
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium">Card background</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={form.cardBackgroundColor || "#0f1623"}
            onChange={(e) => update("cardBackgroundColor", e.target.value)}
            className="h-10 w-12 cursor-pointer rounded border"
          />
          <Input
            value={form.cardBackgroundColor}
            onChange={(e) => update("cardBackgroundColor", e.target.value)}
            placeholder="#0f1623"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Pool manager</label>
        <Input
          placeholder="Manager name"
          value={form.poolManagerName}
          onChange={(e) => update("poolManagerName", e.target.value)}
        />
      </div>

      <Input
        placeholder="Manager icon URL"
        value={form.poolManagerIconUrl}
        onChange={(e) => update("poolManagerIconUrl", e.target.value)}
        className="sm:col-span-2"
      />

      <label className="sm:col-span-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isInviteOnly}
          onChange={(e) => update("isInviteOnly", e.target.checked)}
        />
        Invite-only pool
      </label>
    </div>
  );
}

export function poolFormToPayload(form: PoolFormFields, includeAdditionalCapital = false) {
  const payload: Record<string, unknown> = {
    name: form.name,
    description: form.description,
    poolDescription: form.poolDescription,
    tradingPair: form.tradingPair,
    poolDurationDays: Number(form.poolDurationDays),
    minInvestment: Number(form.minInvestment),
    maxInvestment: form.maxInvestment ? Number(form.maxInvestment) : null,
    targetCapital: Number(form.targetCapital),
    profitTargetPct: Number(form.profitTargetPct),
    targetInvestors: Number(form.targetInvestors),
    isInviteOnly: form.isInviteOnly,
    cardBackgroundColor: form.cardBackgroundColor || null,
    poolManagerName: form.poolManagerName || null,
    poolManagerIconUrl: form.poolManagerIconUrl || null,
  };

  if (includeAdditionalCapital && form.additionalCapital) {
    const amount = Number(form.additionalCapital);
    if (Number.isFinite(amount) && amount > 0) {
      payload.additionalCapital = amount;
    }
  }

  return payload;
}

export function adminFundToForm(fund: {
  name: string;
  description: string;
  poolDescription: string;
  tradingPair: string;
  poolDurationDays: number | null;
  minInvestment: number;
  maxInvestment: number | null;
  targetCapital: number;
  profitTargetPct: number;
  targetInvestors: number;
  isInviteOnly: boolean;
  cardBackgroundColor: string | null;
  poolManagerName: string | null;
  poolManagerIconUrl: string | null;
}): PoolFormFields {
  return {
    name: fund.name,
    description: fund.description,
    poolDescription: fund.poolDescription,
    tradingPair: fund.tradingPair,
    poolDurationDays: String(fund.poolDurationDays ?? 90),
    minInvestment: String(fund.minInvestment),
    maxInvestment: fund.maxInvestment != null ? String(fund.maxInvestment) : "",
    targetCapital: String(fund.targetCapital),
    profitTargetPct: String(fund.profitTargetPct),
    targetInvestors: String(fund.targetInvestors),
    isInviteOnly: fund.isInviteOnly,
    cardBackgroundColor: fund.cardBackgroundColor ?? "#0f1623",
    poolManagerName: fund.poolManagerName ?? "",
    poolManagerIconUrl: fund.poolManagerIconUrl ?? "",
    additionalCapital: "",
  };
}
