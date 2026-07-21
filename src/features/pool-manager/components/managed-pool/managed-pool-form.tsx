"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/constants/routes";
import { REFERENCE_SET_KEYS } from "@/domain/reference-data/set-keys";
import {
  MANAGED_POOL_DURATION_UNITS,
  MANAGED_POOL_RISK_LEVELS,
  MANAGED_POOL_VISIBILITY,
  type ManagedPoolFormInput,
} from "@/domain/pools/managed-pool";
import {
  MANAGED_POOL_RETURN_MODEL_LABELS,
  MANAGED_POOL_RETURN_MODELS,
} from "@/domain/pools/return-model";
import {
  TRADING_SESSION_OPTIONS,
  TRADING_TIME_ZONE_LABEL,
} from "@/domain/pools/trading-session";
import { ReferenceMultiSelect } from "@/components/reference-data/reference-multi-select";
import { ReferenceInstrumentPicker } from "@/components/reference-data/reference-instrument-picker";
import { useReferenceData } from "@/hooks/use-reference-data";
import {
  pmInputClass,
  pmSelectContentClass,
  pmSelectItemClass,
  pmSelectTriggerClass,
  pmTextareaClass,
} from "@/features/pool-manager/constants/ui";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import { PmSectionCard } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PoolImageUpload } from "./pool-image-upload";
import { PmReturnTiersEditor } from "./pm-return-tiers-editor";

function buildStrategyReturnUrl(poolId?: string): string {
  const returnTo = poolId
    ? `${ROUTES.poolManagerPools}/${poolId}`
    : `${ROUTES.poolManagerPools}/new`;
  return `${ROUTES.poolManagerStrategies}/new?returnTo=${encodeURIComponent(returnTo)}`;
}

export function ManagedPoolForm({
  values,
  onChange,
  editable = true,
  poolId,
  approvedStrategies = [],
}: {
  values: ManagedPoolFormInput;
  onChange: (values: ManagedPoolFormInput) => void;
  editable?: boolean;
  poolId?: string;
  approvedStrategies?: { id: string; name: string }[];
}) {
  const { items: marketOptions, loading: marketsLoading } = useReferenceData(
    REFERENCE_SET_KEYS.FINANCIAL_MARKETS
  );

  function patch<K extends keyof ManagedPoolFormInput>(key: K, value: ManagedPoolFormInput[K]) {
    onChange({ ...values, [key]: value });
  }

  const isFixedReturn = values.returnModel === "fixed";
  const marketCodes = values.marketTypeCode ? [values.marketTypeCode] : [];

  return (
    <div className="space-y-8">
      <PmSectionCard title="Pool Information" description="How investors will discover your pool.">
        <div className="space-y-6">
          <PmFormField label="Pool Name" hint="The public name shown in the Marketplace." required>
            <Input
              value={values.poolName}
              onChange={(e) => patch("poolName", e.target.value)}
              disabled={!editable}
              required
              className={pmInputClass}
            />
          </PmFormField>
          <PmFormField label="Pool Description" hint="Overview of what this pool offers investors.">
            <Textarea
              value={values.poolDescription}
              onChange={(e) => patch("poolDescription", e.target.value)}
              disabled={!editable}
              rows={3}
              className={pmTextareaClass}
            />
          </PmFormField>
          <PmFormField label="Cover Image" hint="Cover image shown on your pool card in the Marketplace. Drag to reposition after upload.">
            <PoolImageUpload
              imageUrl={values.poolImageUrl ?? ""}
              coverImagePosition={values.coverImagePosition}
              poolId={poolId}
              disabled={!editable}
              onUploaded={(url) => patch("poolImageUrl", url)}
              onCoverImagePositionChange={(position) => patch("coverImagePosition", position)}
              onClear={() => patch("poolImageUrl", "")}
            />
          </PmFormField>
        </div>
      </PmSectionCard>

      <PmSectionCard
        title="Strategy"
        description="Every pool must use an approved strategy."
      >
        <PmFormField label="Approved Strategy" hint="Includes your default application strategy and any additional approved strategies." required>
          <Select
            value={values.strategyId || "none"}
            onValueChange={(v) => patch("strategyId", v === "none" ? "" : v)}
            disabled={!editable}
          >
            <SelectTrigger className={pmSelectTriggerClass}>
              <SelectValue placeholder="Select strategy" />
            </SelectTrigger>
            <SelectContent className={pmSelectContentClass}>
              <SelectItem value="none" className={pmSelectItemClass}>
                Select a strategy
              </SelectItem>
              {approvedStrategies.map((s) => (
                <SelectItem key={s.id} value={s.id} className={pmSelectItemClass}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PmFormField>
        {editable && (
          <p className="text-sm text-[var(--id-text-muted)]">
            <Link href={buildStrategyReturnUrl(poolId)} className="text-[var(--id-accent-text)] underline">
              Set New Strategy
            </Link>
            {" — opens strategy creation and returns here after saving."}
          </p>
        )}
        {approvedStrategies.length === 0 && editable && (
          <p className="text-sm text-[var(--id-text-muted)]">
            No approved strategies yet.{" "}
            <Link href={buildStrategyReturnUrl(poolId)} className="text-[var(--id-accent-text)] underline">
              Create a strategy
            </Link>
          </p>
        )}
      </PmSectionCard>

      <PmSectionCard
        title="Trading Details"
        description="Publicly visible trading session and instrument information. All times use New York Time."
      >
        <div className="space-y-6">
          <PmFormField label="Trading Session" required>
            <Select
              value={values.tradingSessionKey || "none"}
              onValueChange={(v) => patch("tradingSessionKey", v === "none" ? "" : v)}
              disabled={!editable}
            >
              <SelectTrigger className={pmSelectTriggerClass}>
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent className={pmSelectContentClass}>
                <SelectItem value="none" className={pmSelectItemClass}>Select session</SelectItem>
                {TRADING_SESSION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className={pmSelectItemClass}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PmFormField>
          {values.tradingSessionKey === "custom" && (
            <PmFormField label="Custom Session Name">
              <Input
                value={values.tradingSessionCustom}
                onChange={(e) => patch("tradingSessionCustom", e.target.value)}
                disabled={!editable}
                className={pmInputClass}
              />
            </PmFormField>
          )}
          <PmFormField label="Trading Time" hint={TRADING_TIME_ZONE_LABEL}>
            <Input
              type="time"
              value={values.tradingTimeNy}
              onChange={(e) => patch("tradingTimeNy", e.target.value)}
              disabled={!editable}
              className={pmInputClass}
            />
          </PmFormField>
        </div>
      </PmSectionCard>

      <PmSectionCard title="What Is Traded" description="Publicly visible market and instrument.">
        <div className="space-y-6">
          <PmFormField label="Market Type" required>
            <ReferenceMultiSelect
              options={marketOptions}
              value={marketCodes}
              onChange={(codes) => {
                const next = codes.length === 0 ? "" : codes[codes.length - 1]!;
                patch("marketTypeCode", next);
                if (next !== values.marketTypeCode) patch("tradingInstrumentCode", "");
              }}
              disabled={!editable}
              loading={marketsLoading}
            />
          </PmFormField>
          <PmFormField label="Trading Instrument" required>
            <ReferenceInstrumentPicker
              marketCodes={marketCodes}
              value={values.tradingInstrumentCode}
              onChange={(code) => patch("tradingInstrumentCode", code)}
              disabled={!editable}
            />
          </PmFormField>
        </div>
      </PmSectionCard>

      <PmSectionCard title="Investment Rules" description="Participation requirements for the investment cycle.">
        <div className="grid gap-6 sm:grid-cols-2">
          <PmFormField label="Minimum Investment" hint="Must not exceed maximum investment when submitting.">
            <Input type="number" min={0} value={values.minInvestment} onChange={(e) => patch("minInvestment", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
          <PmFormField label="Maximum Investment">
            <Input type="number" min={0} value={values.maxInvestment} onChange={(e) => patch("maxInvestment", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
          <PmFormField label="Target Capital" hint="Target capital to raise for this cycle.">
            <Input type="number" min={0} value={values.maxPoolSize} onChange={(e) => patch("maxPoolSize", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
          <PmFormField label="Target Investors">
            <Input type="number" min={1} value={values.maxInvestors} onChange={(e) => patch("maxInvestors", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
          <PmFormField label="Funding Period (days)" hint="Public funding countdown duration.">
            <Input type="number" min={1} value={values.fundingPeriodDays} onChange={(e) => patch("fundingPeriodDays", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
        </div>
      </PmSectionCard>

      <PmSectionCard title="Schedule" description="Opening and closing dates, or leave open until manually closed.">
        <div className="space-y-6">
          <PmFormField label="Schedule">
            <Select
              value={values.scheduleOpenEnded ? "open" : "fixed"}
              onValueChange={(v) => patch("scheduleOpenEnded", v === "open")}
              disabled={!editable}
            >
              <SelectTrigger className={pmSelectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={pmSelectContentClass}>
                <SelectItem value="fixed" className={pmSelectItemClass}>Fixed opening and closing dates</SelectItem>
                <SelectItem value="open" className={pmSelectItemClass}>Open until manually closed</SelectItem>
              </SelectContent>
            </Select>
          </PmFormField>
          {!values.scheduleOpenEnded && (
            <div className="grid gap-6 sm:grid-cols-2">
              <PmFormField label="Opening Date">
                <Input type="date" value={values.openingDate} onChange={(e) => patch("openingDate", e.target.value)} disabled={!editable} className={pmInputClass} />
              </PmFormField>
              <PmFormField label="Closing Date">
                <Input type="date" value={values.closingDate} onChange={(e) => patch("closingDate", e.target.value)} disabled={!editable} className={pmInputClass} />
              </PmFormField>
            </div>
          )}
          <div className="grid gap-6 sm:grid-cols-2">
            <PmFormField label="Duration">
              <Input type="number" min={1} value={values.tradingDurationDays} onChange={(e) => patch("tradingDurationDays", e.target.value)} disabled={!editable} className={pmInputClass} />
            </PmFormField>
            <PmFormField label="Duration Unit">
              <Select value={values.durationUnit} onValueChange={(v) => patch("durationUnit", v as ManagedPoolFormInput["durationUnit"])} disabled={!editable}>
                <SelectTrigger className={pmSelectTriggerClass}><SelectValue /></SelectTrigger>
                <SelectContent className={pmSelectContentClass}>
                  {MANAGED_POOL_DURATION_UNITS.map((u) => (
                    <SelectItem key={u} value={u} className={`${pmSelectItemClass} capitalize`}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PmFormField>
          </div>
        </div>
      </PmSectionCard>

      <PmSectionCard title="Risk Configuration" description="Risk profile and return targets for this pool.">
        <div className="grid gap-6 sm:grid-cols-2">
          <PmFormField label="Risk Level">
            <Select value={values.riskLevel || "none"} onValueChange={(v) => patch("riskLevel", v === "none" ? "" : v as ManagedPoolFormInput["riskLevel"])} disabled={!editable}>
              <SelectTrigger className={pmSelectTriggerClass}><SelectValue placeholder="Select risk level" /></SelectTrigger>
              <SelectContent className={pmSelectContentClass}>
                <SelectItem value="none" className={pmSelectItemClass}>Not set</SelectItem>
                {MANAGED_POOL_RISK_LEVELS.map((r) => (
                  <SelectItem key={r} value={r} className={`${pmSelectItemClass} capitalize`}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PmFormField>
          <PmFormField label="Target Return (%)">
            <Input type="number" min={0} step="0.1" value={values.targetReturnPct} onChange={(e) => patch("targetReturnPct", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
          <PmFormField label="Target Drawdown (%)">
            <Input type="number" min={0} step="0.1" value={values.maxDrawdownPct} onChange={(e) => patch("maxDrawdownPct", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
          <PmFormField label="Leverage (optional)">
            <Input value={values.leverage} onChange={(e) => patch("leverage", e.target.value)} disabled={!editable} placeholder="e.g. 1:30" className={pmInputClass} />
          </PmFormField>
        </div>
      </PmSectionCard>

      <PmSectionCard title="Return Structure" description="Select how investor returns are calculated at settlement.">
        <PmFormField label="Return Model" required>
          <Select
            value={values.returnModel}
            onValueChange={(v) => patch("returnModel", v as ManagedPoolFormInput["returnModel"])}
            disabled={!editable}
          >
            <SelectTrigger className={pmSelectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={pmSelectContentClass}>
              {MANAGED_POOL_RETURN_MODELS.map((model) => (
                <SelectItem key={model} value={model} className={pmSelectItemClass}>
                  {MANAGED_POOL_RETURN_MODEL_LABELS[model]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PmFormField>

        {isFixedReturn ? (
          <div className="mt-6">
            <p className="mb-4 text-sm text-[var(--id-text-muted)]">
              Define fixed investor returns by investment amount tier. At settlement, promised returns are paid first from net trading profits after the 2.5% platform fee.
            </p>
            <PmReturnTiersEditor
              tiers={values.returnTiers}
              onChange={(returnTiers) => patch("returnTiers", returnTiers)}
              disabled={!editable}
            />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <PmReturnTiersEditor
              tiers={values.returnTiers}
              onChange={(returnTiers) => patch("returnTiers", returnTiers)}
              disabled={!editable}
            />
            <div className="grid gap-6 sm:grid-cols-2 border-t border-white/10 pt-6">
              <PmFormField label="Investor Share (%)" hint="Share of net profit after platform fee. Must total 100% with PM share.">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={values.investorSharePct}
                  onChange={(e) => patch("investorSharePct", e.target.value)}
                  disabled={!editable}
                  className={pmInputClass}
                />
              </PmFormField>
              <PmFormField label="Pool Manager Share (%)">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={values.poolManagerSharePct}
                  onChange={(e) => patch("poolManagerSharePct", e.target.value)}
                  disabled={!editable}
                  className={pmInputClass}
                />
              </PmFormField>
            </div>
          </div>
        )}
      </PmSectionCard>

      <PmSectionCard title="Pool Appearance & Visibility" description="Presentation and marketplace visibility.">
        <div className="space-y-6">
          <PmFormField label="Card Background Color" hint="Hex color used on your marketplace pool card.">
            <div className="flex items-center gap-3">
              <Input
                value={values.cardBackgroundColor}
                onChange={(e) => patch("cardBackgroundColor", e.target.value)}
                disabled={!editable}
                placeholder="#0f1623"
                className={pmInputClass}
              />
              <span
                className="h-10 w-10 shrink-0 rounded-md border border-border"
                style={{ backgroundColor: values.cardBackgroundColor || "#0f1623" }}
              />
            </div>
          </PmFormField>
          <PmFormField label="Pool Visibility">
          <Select value={values.visibility} onValueChange={(v) => patch("visibility", v as ManagedPoolFormInput["visibility"])} disabled={!editable}>
            <SelectTrigger className={pmSelectTriggerClass}><SelectValue /></SelectTrigger>
            <SelectContent className={pmSelectContentClass}>
              {MANAGED_POOL_VISIBILITY.map((v) => (
                <SelectItem key={v} value={v} className={`${pmSelectItemClass} capitalize`}>{v.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </PmFormField>
        </div>
      </PmSectionCard>
    </div>
  );
}
