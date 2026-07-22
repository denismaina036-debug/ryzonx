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
  toTradingDateTimeLocalValue,
} from "@/domain/pools/trading-session";
import { normalizeMarketCodes } from "@/domain/reference-data/utils";
import { ReferenceMultiSelect } from "@/components/reference-data/reference-multi-select";
import { ReferenceInstrumentMultiSelect } from "@/components/reference-data/reference-instrument-multi-select";
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
import { PmFixedReturnEditor } from "./pm-fixed-return-editor";
import { PmVariableReturnEditor } from "./pm-variable-return-editor";

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
  const marketsTradedCodes = values.marketsTradedCodes ?? [];
  const tradingInstrumentCodes = values.tradingInstrumentCodes ?? [];
  const normalizedMarkets = normalizeMarketCodes(marketsTradedCodes);

  function onMarketsChange(codes: string[]) {
    const nextMarkets = normalizeMarketCodes(codes);
    onChange({
      ...values,
      marketsTradedCodes: nextMarkets,
      marketTypeCode: nextMarkets[0] ?? "",
      tradingInstrumentCodes: [],
      tradingInstrumentCode: "",
    });
  }

  function onInstrumentsChange(codes: string[]) {
    onChange({
      ...values,
      tradingInstrumentCodes: codes,
      tradingInstrumentCode: codes[0] ?? "",
    });
  }

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
          <PmFormField
            label="Trading Date & Time"
            hint={`When trading begins — ${TRADING_TIME_ZONE_LABEL}.`}
            required
          >
            <Input
              type="datetime-local"
              value={toTradingDateTimeLocalValue(values.tradingTimeNy)}
              onChange={(e) => patch("tradingTimeNy", e.target.value)}
              disabled={!editable}
              className={pmInputClass}
            />
          </PmFormField>
        </div>
      </PmSectionCard>

      <PmSectionCard
        title="What Is Traded"
        description="Select the markets and instruments this pool trades — same as your Pool Manager application."
      >
        <div className="space-y-6">
          <PmFormField label="Markets Traded" required>
            <ReferenceMultiSelect
              options={marketOptions}
              value={normalizedMarkets}
              onChange={onMarketsChange}
              disabled={!editable}
              loading={marketsLoading}
            />
          </PmFormField>
          <PmFormField label="Trading Instruments" required>
            <ReferenceInstrumentMultiSelect
              marketCodes={normalizedMarkets}
              value={tradingInstrumentCodes}
              onChange={onInstrumentsChange}
              disabled={!editable}
            />
            {tradingInstrumentCodes.length > 0 && (
              <p className="mt-2 text-xs text-[var(--id-text-muted)]">
                {tradingInstrumentCodes.length} instrument
                {tradingInstrumentCodes.length === 1 ? "" : "s"} selected
              </p>
            )}
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
          <PmFormField label="Target Investors" hint="Max participants shown on the marketplace (e.g. 0 / 200).">
            <Input type="number" min={1} value={values.maxInvestors} onChange={(e) => patch("maxInvestors", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
          <PmFormField
            label="Display Participants"
            hint="Manual participant count seed. Live investors replace this once higher."
          >
            <Input
              type="number"
              min={0}
              value={values.displayActiveInvestors}
              onChange={(e) => patch("displayActiveInvestors", e.target.value)}
              disabled={!editable}
              className={pmInputClass}
            />
          </PmFormField>
          <PmFormField
            label="Display Raised Capital"
            hint="Manual raised amount seed. Live commitments replace this once higher."
          >
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.displayRaisedCapital}
              onChange={(e) => patch("displayRaisedCapital", e.target.value)}
              disabled={!editable}
              className={pmInputClass}
            />
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
              <PmFormField
                label="Funding Start Date & Time"
                hint={`When funding opens — ${TRADING_TIME_ZONE_LABEL}.`}
              >
                <Input
                  type="datetime-local"
                  value={toTradingDateTimeLocalValue(values.openingDate)}
                  onChange={(e) => patch("openingDate", e.target.value)}
                  disabled={!editable}
                  className={pmInputClass}
                />
              </PmFormField>
              <PmFormField
                label="Funding End Date & Time"
                hint={`When funding closes — ${TRADING_TIME_ZONE_LABEL}.`}
              >
                <Input
                  type="datetime-local"
                  value={toTradingDateTimeLocalValue(values.closingDate)}
                  onChange={(e) => patch("closingDate", e.target.value)}
                  disabled={!editable}
                  className={pmInputClass}
                />
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
        </div>
      </PmSectionCard>

      <PmSectionCard
        title="Return Structure"
        description="Choose one settlement model. Fixed Return and Variable Return are completely independent."
      >
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
            <PmFixedReturnEditor
              rows={values.fixedReturnRows}
              onChange={(fixedReturnRows) => patch("fixedReturnRows", fixedReturnRows)}
              disabled={!editable}
            />
          </div>
        ) : (
          <div className="mt-6">
            <PmVariableReturnEditor
              tiers={values.returnTiers}
              investorSharePct={values.investorSharePct}
              poolManagerSharePct={values.poolManagerSharePct}
              onTiersChange={(returnTiers) => patch("returnTiers", returnTiers)}
              onInvestorShareChange={(investorSharePct) => patch("investorSharePct", investorSharePct)}
              onPoolManagerShareChange={(poolManagerSharePct) =>
                patch("poolManagerSharePct", poolManagerSharePct)
              }
              disabled={!editable}
            />
          </div>
        )}
      </PmSectionCard>

      <PmSectionCard title="Pool Visibility" description="Control who can discover and join this pool.">
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
      </PmSectionCard>
    </div>
  );
}
