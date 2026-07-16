"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Shield, Trophy, FileText, Clock, Sparkles } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { PM_APPLICATION_STEPS, PM_STATUS_LABELS } from "@/features/pool-manager/constants/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, cn } from "@/lib/utils";
import { investorCardClass, investorInputClass } from "@/features/investor/constants/ui";
import type {
  PoolManagerApplication,
  PoolManagerBasicInfo,
  PoolManagerStrategyData,
} from "@/domain/pool-manager/types";
import { USER_ROLES } from "@/constants/roles";

type ChallengeConfig = {
  id: string;
  title: string;
  description: string;
  price: number;
  profitTargetPct: number;
  maxDailyLossPct: number | null;
  maxOverallLossPct: number;
  minTradingDays: number;
  maxRiskPerTradePct: number | null;
  durationDays: number;
  tradingRules: string | null;
  rulesSummary: string | null;
};

interface ApplicationWizardProps {
  userRole: string;
  initialApplication: PoolManagerApplication | null;
  initialChallenge: ChallengeConfig | null;
}

const STRATEGY_SECTIONS: Array<{
  key: keyof PoolManagerStrategyData;
  label: string;
  required?: boolean;
  multiline?: boolean;
}> = [
  { key: "strategyName", label: "Strategy Name", required: true },
  { key: "tradingPhilosophy", label: "Trading Philosophy", required: true, multiline: true },
  { key: "marketsTraded", label: "Markets Traded", multiline: true },
  { key: "timeframes", label: "Timeframes" },
  { key: "entryStrategy", label: "Entry Strategy", multiline: true },
  { key: "exitStrategy", label: "Exit Strategy", multiline: true },
  { key: "tradeManagement", label: "Trade Management", multiline: true },
  { key: "riskManagement", label: "Risk Management", required: true, multiline: true },
  { key: "positionSizing", label: "Position Sizing", multiline: true },
  { key: "maxRiskPerTrade", label: "Maximum Risk Per Trade" },
  { key: "maxDailyDrawdown", label: "Maximum Daily Drawdown" },
  { key: "maxOverallDrawdown", label: "Maximum Overall Drawdown" },
  { key: "maxOpenPositions", label: "Maximum Open Positions" },
  { key: "newsTradingPolicy", label: "News Trading Policy", multiline: true },
  { key: "weekendHoldingPolicy", label: "Weekend Holding Policy", multiline: true },
  { key: "psychologicalRules", label: "Psychological Rules", multiline: true },
  { key: "capitalPreservationRules", label: "Capital Preservation Rules", multiline: true },
  { key: "emergencyStopRules", label: "Emergency Stop Rules", multiline: true },
  { key: "expectedMonthlyReturn", label: "Expected Monthly Return" },
  { key: "targetRiskLevel", label: "Target Risk Level" },
  { key: "expectedInvestorProfile", label: "Expected Investor Profile", multiline: true },
  { key: "additionalNotes", label: "Additional Notes", multiline: true },
];

export function PoolManagerApplicationWizard({
  userRole,
  initialApplication,
  initialChallenge,
}: ApplicationWizardProps) {
  const router = useRouter();
  const [application, setApplication] = useState(initialApplication);
  const [challenge] = useState(initialChallenge);
  const [basicInfo, setBasicInfo] = useState<PoolManagerBasicInfo>(
    initialApplication?.basicInfo ?? {}
  );
  const [strategyData, setStrategyData] = useState<PoolManagerStrategyData>(
    initialApplication?.strategyData ?? {}
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stage = application?.currentStage ?? 1;
  const isApproved = application?.status === "approved";
  const isPoolManager = userRole === USER_ROLES.POOL_MANAGER;

  const startApplication = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pool-manager/application", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApplication(data.application);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!application && userRole !== USER_ROLES.POOL_MANAGER) {
      void startApplication();
    }
  }, [application, userRole, startApplication]);

  async function saveStage1(complete = false) {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/pool-manager/application/stage1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basicInfo, complete }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApplication(data.application);
      setMessage(complete ? "Stage 1 complete" : "Progress saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveStrategy(submit = false) {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/pool-manager/application/strategy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyData, submit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApplication(data.application);
      setMessage(submit ? "Strategy submitted for review" : "Draft saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  if (isPoolManager) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-8 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-emerald-300" />
        <h1 className="mt-4 text-2xl font-bold text-[var(--id-text)]">You&apos;re an approved Pool Manager</h1>
        <p className="mt-2 text-sm text-[var(--id-text-secondary)]">
          Your application was approved. Access your dedicated dashboard to manage pools.
        </p>
        <Button asChild className="mt-6 bg-amber-500 text-black hover:bg-amber-400">
          <Link href={ROUTES.poolManager}>Open Pool Manager Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/90">
          RyvonX Pool Manager Program
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[var(--id-text)] sm:text-4xl">
          Become a Pool Manager
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--id-text-muted)]">
          A premium, multi-stage application for investors ready to professionally manage
          investment pools under RyvonX governance.
        </p>
      </div>

      <ProgressSteps currentStage={stage} approved={isApproved} status={application?.status} />

      {(error || message) && (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm",
            error
              ? "border border-rose-500/30 bg-rose-500/10 text-rose-200"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          )}
        >
          {error ?? message}
        </div>
      )}

      {stage === 1 && (
        <StageCard
          icon={Shield}
          title="Stage 1 — Basic Information"
          subtitle="Tell us about your trading background"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trading Experience *">
              <Input
                value={basicInfo.tradingExperience ?? ""}
                onChange={(e) =>
                  setBasicInfo((b) => ({ ...b, tradingExperience: e.target.value }))
                }
                className={investorInputClass}
              />
            </Field>
            <Field label="Years Trading">
              <Input
                type="number"
                value={basicInfo.yearsTrading ?? ""}
                onChange={(e) =>
                  setBasicInfo((b) => ({
                    ...b,
                    yearsTrading: Number(e.target.value) || undefined,
                  }))
                }
                className={investorInputClass}
              />
            </Field>
            <Field label="Country *">
              <Input
                value={basicInfo.country ?? ""}
                onChange={(e) => setBasicInfo((b) => ({ ...b, country: e.target.value }))}
                className={investorInputClass}
              />
            </Field>
            <Field label="Trading Style">
              <Input
                value={basicInfo.tradingStyle ?? ""}
                onChange={(e) =>
                  setBasicInfo((b) => ({ ...b, tradingStyle: e.target.value }))
                }
                className={investorInputClass}
              />
            </Field>
            <Field label="Markets Traded">
              <Input
                placeholder="Forex, Crypto, Indices…"
                value={(basicInfo.marketsTraded ?? []).join(", ")}
                onChange={(e) =>
                  setBasicInfo((b) => ({
                    ...b,
                    marketsTraded: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
                className={investorInputClass}
              />
            </Field>
            <Field label="Avg. Monthly Return (%)">
              <Input
                type="number"
                value={basicInfo.averageMonthlyReturn ?? ""}
                onChange={(e) =>
                  setBasicInfo((b) => ({
                    ...b,
                    averageMonthlyReturn: Number(e.target.value) || undefined,
                  }))
                }
                className={investorInputClass}
              />
            </Field>
            <Field label="Previous Capital Managed ($)">
              <Input
                type="number"
                value={basicInfo.previousCapitalManaged ?? ""}
                onChange={(e) =>
                  setBasicInfo((b) => ({
                    ...b,
                    previousCapitalManaged: Number(e.target.value) || undefined,
                  }))
                }
                className={investorInputClass}
              />
            </Field>
          </div>
          <Field label="Previous Experience">
            <Textarea
              value={basicInfo.previousExperience ?? ""}
              onChange={(e) =>
                setBasicInfo((b) => ({ ...b, previousExperience: e.target.value }))
              }
              rows={3}
              className={investorInputClass}
            />
          </Field>
          <Field label="Short Biography *">
            <Textarea
              value={basicInfo.biography ?? ""}
              onChange={(e) => setBasicInfo((b) => ({ ...b, biography: e.target.value }))}
              rows={4}
              className={investorInputClass}
            />
          </Field>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="outline"
              disabled={loading}
              className="border-[var(--id-border)]"
              onClick={() => saveStage1(false)}
            >
              Save Progress
            </Button>
            <Button
              disabled={loading}
              className="bg-amber-500 text-black hover:bg-amber-400"
              onClick={() => saveStage1(true)}
            >
              Continue to Challenge
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </StageCard>
      )}

      {stage === 2 && challenge && (
        <StageCard
          icon={Trophy}
          title="Stage 2 — RyvonX Trader Challenge"
          subtitle="Join the active challenge configured by administration"
        >
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5 space-y-3">
            <h3 className="text-lg font-semibold text-[var(--id-text)]">{challenge.title}</h3>
            <p className="text-sm text-[var(--id-text-secondary)]">{challenge.description}</p>
            <dl className="grid gap-2 sm:grid-cols-2 text-sm">
              <Stat label="Challenge Price" value={formatCurrency(challenge.price)} />
              <Stat label="Profit Target" value={`${challenge.profitTargetPct}%`} />
              <Stat
                label="Max Daily Drawdown"
                value={
                  challenge.maxDailyLossPct != null
                    ? `${challenge.maxDailyLossPct}%`
                    : "Not set"
                }
              />
              <Stat label="Max Overall Drawdown" value={`${challenge.maxOverallLossPct}%`} />
              <Stat label="Min Trading Days" value={String(challenge.minTradingDays)} />
              <Stat
                label="Max Risk Per Trade"
                value={
                  challenge.maxRiskPerTradePct != null
                    ? `${challenge.maxRiskPerTradePct}%`
                    : "Not set"
                }
              />
              <Stat label="Duration" value={`${challenge.durationDays} days`} />
            </dl>
            {(challenge.tradingRules || challenge.rulesSummary) && (
              <div className="pt-2 text-sm text-[var(--id-text-muted)]">
                <p className="font-medium text-[var(--id-text-secondary)]">Trading Rules</p>
                <p className="mt-1 whitespace-pre-wrap">
                  {challenge.tradingRules ?? challenge.rulesSummary}
                </p>
              </div>
            )}
          </div>
          <p className="text-sm text-[var(--id-text-muted)]">
            Challenge parameters are read-only. Complete enrollment via your investor
            challenge page, then return here.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-amber-500/30 text-amber-200">
              <Link href={ROUTES.challenge}>Go to Challenge</Link>
            </Button>
            <Button
              disabled={loading}
              className="bg-amber-500 text-black hover:bg-amber-400"
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch("/api/pool-manager/application/stage2", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ complete: true }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  setApplication(data.application);
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not advance");
                } finally {
                  setLoading(false);
                }
              }}
            >
              I&apos;ve joined the challenge — Continue
            </Button>
          </div>
        </StageCard>
      )}

      {stage === 3 && (
        <StageCard
          icon={FileText}
          title="Stage 3 — Trading Strategy Submission"
          subtitle="Submit a structured professional trading plan"
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {STRATEGY_SECTIONS.map(({ key, label, required, multiline }) => (
              <Field key={key} label={`${label}${required ? " *" : ""}`}>
                {multiline ? (
                  <Textarea
                    value={strategyData[key] ?? ""}
                    onChange={(e) =>
                      setStrategyData((s) => ({ ...s, [key]: e.target.value }))
                    }
                    rows={3}
                    className={investorInputClass}
                  />
                ) : (
                  <Input
                    value={strategyData[key] ?? ""}
                    onChange={(e) =>
                      setStrategyData((s) => ({ ...s, [key]: e.target.value }))
                    }
                    className={investorInputClass}
                  />
                )}
              </Field>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              variant="outline"
              disabled={loading}
              className="border-[var(--id-border)]"
              onClick={() => saveStrategy(false)}
            >
              Save Draft
            </Button>
            <Button
              disabled={loading}
              className="bg-amber-500 text-black hover:bg-amber-400"
              onClick={() => saveStrategy(true)}
            >
              Submit for Admin Review
            </Button>
          </div>
        </StageCard>
      )}

      {(stage === 4 || stage === 5) && application && (
        <StageCard
          icon={Clock}
          title={
            isApproved ? "Stage 5 — Pool Manager Activation" : "Stage 4 — Admin Review"
          }
          subtitle={
            isApproved
              ? "Your account has been upgraded"
              : "Your application is being evaluated by RyvonX"
          }
        >
          <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-5">
            <p className="text-sm text-[var(--id-text-muted)]">Application Status</p>
            <p className="mt-1 text-xl font-semibold capitalize text-[var(--id-text)]">
              {PM_STATUS_LABELS[application.status] ?? application.status}
            </p>
            {application.adminNotes && (
              <p className="mt-4 text-sm text-[var(--id-text-secondary)]">
                <span className="font-medium text-[var(--id-text)]">Admin notes: </span>
                {application.adminNotes}
              </p>
            )}
            {application.submittedAt && (
              <p className="mt-2 text-xs text-[var(--id-text-muted)]">
                Submitted {new Date(application.submittedAt).toLocaleString()}
              </p>
            )}
          </div>
          {isApproved && (
            <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
              <Link href={ROUTES.poolManager}>Enter Pool Manager Dashboard</Link>
            </Button>
          )}
          {!isApproved && application.status === "requires_changes" && (
            <Button
              variant="outline"
              className="border-amber-500/30"
              onClick={() => saveStrategy(false)}
            >
              Update Strategy Submission
            </Button>
          )}
        </StageCard>
      )}

      <p className="text-center text-xs text-[var(--id-text-secondary)]">
        <Link href={ROUTES.dashboard} className="hover:text-[var(--id-text-muted)]">
          ← Back to Investor Dashboard
        </Link>
      </p>
    </div>
  );
}

function ProgressSteps({
  currentStage,
  approved,
  status,
}: {
  currentStage: number;
  approved?: boolean;
  status?: string;
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[640px] items-center justify-between gap-1">
        {PM_APPLICATION_STEPS.map((step, idx) => {
          const done = approved ? true : step.stage < currentStage;
          const active = !approved && step.stage === currentStage;
          const reviewActive = status === "pending" || status === "under_review";
          const isReviewStep = step.stage === 4 && reviewActive;

          return (
            <div key={step.stage} className="flex flex-1 items-center">
              <div className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold",
                    done || isReviewStep
                      ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                      : active
                        ? "border-amber-400 bg-amber-500/30 text-[var(--id-text)]"
                        : "border-[var(--id-border)] bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : step.stage}
                </div>
                <p className="mt-2 hidden text-[10px] font-medium text-[var(--id-text-muted)] sm:block">
                  {step.title}
                </p>
              </div>
              {idx < PM_APPLICATION_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-px flex-1",
                    done ? "bg-amber-500/40" : "bg-[var(--id-border)]"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StageCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(investorCardClass, "p-6 sm:p-8")}>
      <div className="mb-6 flex items-start gap-4">
        <div className="rounded-xl bg-amber-500/15 p-3 ring-1 ring-amber-500/25">
          <Icon className="h-6 w-6 text-amber-300" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--id-text)]">{title}</h2>
          <p className="text-sm text-[var(--id-text-muted)]">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--id-text-muted)]">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--id-text-muted)]">{label}</dt>
      <dd className="font-medium text-[var(--id-text)]">{value}</dd>
    </div>
  );
}
