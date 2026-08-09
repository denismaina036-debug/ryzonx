"use client";

import Link from "next/link";
import { toast } from "sonner";
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
  MANAGED_POOL_RISK_LEVELS,
  MANAGED_POOL_VISIBILITY,
  type ManagedPoolFormInput,
} from "@/domain/pools/managed-pool";
import {
  TRADING_SESSION_OPTIONS,
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
import { PmTradingScheduleEditor } from "./pm-trading-schedule-editor";

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
  showParticipationLimits = false,
}: {
  values: ManagedPoolFormInput;
  onChange: (values: ManagedPoolFormInput) => void;
  editable?: boolean;
  poolId?: string;
  approvedStrategies?: { id: string; name: string }[];
  showParticipationLimits?: boolean;
}) {
  const { items: marketOptions, loading: marketsLoading } = useReferenceData(
    REFERENCE_SET_KEYS.FINANCIAL_MARKETS
  );

  function patch<K extends keyof ManagedPoolFormInput>(key: K, value: ManagedPoolFormInput[K]) {
    onChange({ ...values, [key]: value });
  }

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
              onClear={() => {
                void (async () => {
                  if (poolId) {
                    const res = await fetch(
                      `/api/pool-manager/pools/${poolId}/cover-image`,
                      { method: "DELETE" }
                    );
                    const body = (await res.json()) as { error?: string };
                    if (!res.ok) {
                      toast.error(body.error ?? "Could not remove cover image");
                      return;
                    }
                  }
                  patch("poolImageUrl", "");
                  toast.success("Cover image removed");
                })();
              }}
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
          <PmTradingScheduleEditor
            preset={values.tradingSchedulePreset}
            days={values.tradingScheduleDays}
            time={values.tradingScheduleTime}
            onPresetChange={(value) => patch("tradingSchedulePreset", value)}
            onDaysChange={(value) => patch("tradingScheduleDays", value)}
            onTimeChange={(value) => patch("tradingScheduleTime", value)}
            disabled={!editable}
          />
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

      <PmSectionCard title="Marketplace Presentation" description="Optional display seeds for your pool card. Live totals replace these once higher.">
        <div className="grid gap-6 sm:grid-cols-2">
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

      {showParticipationLimits && (
        <PmSectionCard
          title="Participation Limits"
          description="Optional pool-wide cap. Cycle funding terms are set under the Cycles tab."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <PmFormField label="Maximum Investment">
              <Input
                type="number"
                min={0}
                value={values.maxInvestment}
                onChange={(e) => patch("maxInvestment", e.target.value)}
                disabled={!editable}
                className={pmInputClass}
              />
            </PmFormField>
          </div>
        </PmSectionCard>
      )}

      <PmSectionCard title="Risk Configuration" description="Risk profile for this pool.">
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
          <PmFormField label="Target Drawdown (%)">
            <Input type="number" min={0} step="0.1" value={values.maxDrawdownPct} onChange={(e) => patch("maxDrawdownPct", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
        </div>
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
