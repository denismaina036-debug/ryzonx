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
import {
  MANAGED_POOL_DURATION_UNITS,
  MANAGED_POOL_RISK_LEVELS,
  MANAGED_POOL_VISIBILITY,
  type ManagedPoolFormInput,
} from "@/domain/pools/managed-pool";
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
  function patch<K extends keyof ManagedPoolFormInput>(key: K, value: ManagedPoolFormInput[K]) {
    onChange({ ...values, [key]: value });
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
          <PmFormField label="Cover Image" hint="Cover image shown on your pool card in the Marketplace.">
            <PoolImageUpload
              imageUrl={values.poolImageUrl ?? ""}
              poolId={poolId}
              disabled={!editable}
              onUploaded={(url) => patch("poolImageUrl", url)}
              onClear={() => patch("poolImageUrl", "")}
            />
          </PmFormField>
        </div>
      </PmSectionCard>

      <PmSectionCard
        title="Strategy"
        description="Choose one approved strategy. Create and submit strategies separately before building a pool."
      >
        <PmFormField label="Approved Strategy" hint="Only approved strategies can be linked to a pool." required>
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
        {approvedStrategies.length === 0 && editable && (
          <p className="text-sm text-[var(--id-text-muted)]">
            No approved strategies yet.{" "}
            <Link href={ROUTES.poolManagerStrategies} className="text-[var(--id-accent-text)] underline">
              Manage strategies
            </Link>
          </p>
        )}
      </PmSectionCard>

      <PmSectionCard
        title="Trading Session"
        description="Describe how this pool operates during live trading."
      >
        <div className="space-y-6">
          <PmFormField label="Trading Methodology">
            <Textarea
              value={values.tradingMethodology}
              onChange={(e) => patch("tradingMethodology", e.target.value)}
              disabled={!editable}
              rows={4}
              className={pmTextareaClass}
            />
          </PmFormField>
          <PmFormField label="Markets" hint="Comma-separated symbols or markets.">
            <Input
              value={values.markets}
              onChange={(e) => patch("markets", e.target.value)}
              disabled={!editable}
              placeholder="XAU/USD, EUR/USD"
              className={pmInputClass}
            />
          </PmFormField>
          <PmFormField label="Sessions" hint="e.g. London, New York, Asian">
            <Input
              value={values.tradingSessions}
              onChange={(e) => patch("tradingSessions", e.target.value)}
              disabled={!editable}
              className={pmInputClass}
            />
          </PmFormField>
          <PmFormField label="Trading Hours">
            <Input
              value={values.tradingHours}
              onChange={(e) => patch("tradingHours", e.target.value)}
              disabled={!editable}
              placeholder="e.g. 08:00–17:00 UTC"
              className={pmInputClass}
            />
          </PmFormField>
          <PmFormField label="Timeframes">
            <Input
              value={values.timeframes}
              onChange={(e) => patch("timeframes", e.target.value)}
              disabled={!editable}
              placeholder="H1, H4, Daily"
              className={pmInputClass}
            />
          </PmFormField>
          <PmFormField label="Expected Trade Frequency">
            <Textarea
              value={values.expectedBehavior}
              onChange={(e) => patch("expectedBehavior", e.target.value)}
              disabled={!editable}
              rows={3}
              className={pmTextareaClass}
            />
          </PmFormField>
          <PmFormField label="Manager Notes" hint="Additional context for investors and administrators.">
            <Textarea
              value={values.managerNotes}
              onChange={(e) => patch("managerNotes", e.target.value)}
              disabled={!editable}
              rows={3}
              className={pmTextareaClass}
            />
          </PmFormField>
        </div>
      </PmSectionCard>

      <PmSectionCard title="Investment Rules" description="Funding terms and participation limits.">
        <div className="grid gap-6 sm:grid-cols-2">
          <PmFormField label="Minimum Investment" hint="Must not exceed maximum capacity when submitting.">
            <Input type="number" min={0} value={values.minInvestment} onChange={(e) => patch("minInvestment", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
          <PmFormField label="Maximum Investment">
            <Input type="number" min={0} value={values.maxInvestment} onChange={(e) => patch("maxInvestment", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
          <PmFormField label="Maximum Capacity" hint="Target capital to raise.">
            <Input type="number" min={0} value={values.maxPoolSize} onChange={(e) => patch("maxPoolSize", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
          <PmFormField label="Maximum Investors">
            <Input type="number" min={1} value={values.maxInvestors} onChange={(e) => patch("maxInvestors", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
          <PmFormField label="Funding Period (days)">
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

      <PmSectionCard title="Risk Configuration" description="Risk profile and return targets.">
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
          <PmFormField label="Maximum Drawdown (%)">
            <Input type="number" min={0} step="0.1" value={values.maxDrawdownPct} onChange={(e) => patch("maxDrawdownPct", e.target.value)} disabled={!editable} className={pmInputClass} />
          </PmFormField>
          <PmFormField label="Leverage (optional)">
            <Input value={values.leverage} onChange={(e) => patch("leverage", e.target.value)} disabled={!editable} placeholder="e.g. 1:30" className={pmInputClass} />
          </PmFormField>
        </div>
      </PmSectionCard>

      <PmSectionCard title="Return Structure" description="Defines how the Investor Profit Pool is allocated by investment amount tier (return multipliers and tier weighting).">
        <PmReturnTiersEditor
          tiers={values.returnTiers}
          onChange={(returnTiers) => patch("returnTiers", returnTiers)}
          disabled={!editable}
        />
      </PmSectionCard>

      <PmSectionCard
        title="Profit Sharing Agreement"
        description="Split of net profit after the RyvonX 2.5% service fee. Must total 100%."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <PmFormField label="Investor Share (%)">
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
