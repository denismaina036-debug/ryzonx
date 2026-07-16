"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Shield,
  Target,
  Trophy,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  cryptoFlowInputClass,
  cryptoFlowPrimaryButtonClass,
} from "@/features/investor/components/crypto-flow/crypto-flow-step";
import { ChallengeView } from "@/features/investor/components/challenge-view";
import { MANAGER_JOURNEY_STAGES } from "@/features/investor/constants/manager-journey";
import { ROUTES } from "@/constants/routes";
import { PM_APPLICATION_STAGES } from "@/domain/pool-manager/types";
import type { PoolManagerApplication, PoolManagerBasicInfo } from "@/domain/pool-manager/types";
import { cn, formatCurrency } from "@/lib/utils";
import type { ChallengeEnrollment, TraderChallenge } from "@/features/investor/types";

const WIZARD_STEPS = [
  { id: 1, label: "Experience", icon: User },
  { id: 2, label: "Markets", icon: Target },
  { id: 3, label: "Profile", icon: Shield },
  { id: 4, label: "Requirements", icon: Check },
  { id: 5, label: "Evaluation", icon: Trophy },
] as const;

const cryptoFlowTextareaClass =
  "min-h-[100px] w-full resize-y rounded-md border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-3 text-sm text-[var(--id-text)] placeholder:text-[var(--id-text-faint)] focus-visible:border-[var(--id-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--id-accent-soft)]";

interface ManagerJourneyViewProps {
  challenge: TraderChallenge;
  enrollment: ChallengeEnrollment | null;
  availableBalance: number;
  application: PoolManagerApplication | null;
}

function getInitialStep(
  application: PoolManagerApplication | null,
  enrollment: ChallengeEnrollment | null
): number {
  if (application?.currentStage && application.currentStage >= PM_APPLICATION_STAGES.CHALLENGE) {
    return 5;
  }

  if (
    enrollment?.status === "pending_payment" ||
    enrollment?.status === "awaiting_setup"
  ) {
    return 5;
  }

  const info = application?.basicInfo ?? {};
  if (!info.tradingExperience?.trim()) return 1;
  if (!info.country?.trim() || !info.biography?.trim()) return 3;
  return 4;
}

export function ManagerJourneyView({
  challenge,
  enrollment,
  availableBalance,
  application: initialApplication,
}: ManagerJourneyViewProps) {
  const router = useRouter();
  const [application, setApplication] = useState(initialApplication);
  const [basicInfo, setBasicInfo] = useState<PoolManagerBasicInfo>(
    initialApplication?.basicInfo ?? {}
  );
  const [step, setStep] = useState(() => getInitialStep(initialApplication, enrollment));
  const [requirementsAccepted, setRequirementsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(!initialApplication);

  const postPayment =
    enrollment &&
    ["awaiting_setup", "active", "paid", "completed"].includes(enrollment.status);

  const ensureApplication = useCallback(async () => {
    if (application) return application;
    const res = await fetch("/api/pool-manager/application", { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not start application");
    setApplication(data.application);
    setBasicInfo(data.application.basicInfo ?? {});
    return data.application as PoolManagerApplication;
  }, [application]);

  useEffect(() => {
    if (initialApplication) return;
    void (async () => {
      try {
        await ensureApplication();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not start journey");
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [initialApplication, ensureApplication]);

  async function saveBasicInfo(partial?: Partial<PoolManagerBasicInfo>) {
    const nextInfo = partial ? { ...basicInfo, ...partial } : basicInfo;
    setBasicInfo(nextInfo);
    await ensureApplication();
    const res = await fetch("/api/pool-manager/application/stage1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ basicInfo: nextInfo }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Save failed");
    setApplication(data.application);
    return data.application as PoolManagerApplication;
  }

  async function completeRequirements() {
    setLoading(true);
    try {
      await saveBasicInfo();
      const res = await fetch("/api/pool-manager/application/stage1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complete: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not continue");
      setApplication(data.application);
      setStep(5);
      toast.success("Requirements saved", {
        description: "Proceed to the trader evaluation when you are ready.",
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not continue");
    } finally {
      setLoading(false);
    }
  }

  async function goNext() {
    setLoading(true);
    try {
      if (step === 1) {
        if (!basicInfo.tradingExperience?.trim()) {
          toast.error("Tell us about your trading experience");
          return;
        }
        await saveBasicInfo();
        setStep(2);
        return;
      }

      if (step === 2) {
        await saveBasicInfo();
        setStep(3);
        return;
      }

      if (step === 3) {
        if (!basicInfo.country?.trim() || !basicInfo.biography?.trim()) {
          toast.error("Country and biography are required");
          return;
        }
        await saveBasicInfo();
        setStep(4);
        return;
      }

      if (step === 4) {
        if (!requirementsAccepted) {
          toast.error("Please confirm you understand the program requirements");
          return;
        }
        await completeRequirements();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (step > 1) setStep(step - 1);
  }

  const journeyPreview = useMemo(
    () => MANAGER_JOURNEY_STAGES.slice(0, 5),
    []
  );

  if (postPayment) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-3xl">
        <JourneyHeader />
        <ChallengeView
          challenge={challenge}
          enrollment={enrollment}
          availableBalance={availableBalance}
        />
      </div>
    );
  }

  if (bootstrapping) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-3xl">
        <JourneyHeader />
        <div className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-12 text-center shadow-[var(--id-shadow)]">
          <p className="text-sm text-[var(--id-text-muted)]">Preparing your journey…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <JourneyHeader />

      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex min-w-[520px] items-center justify-between gap-1">
          {WIZARD_STEPS.map((item, index) => {
            const Icon = item.icon;
            const done = step > item.id;
            const active = step === item.id;
            return (
              <div key={item.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center text-center">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset transition-all duration-300",
                      done &&
                        "bg-[var(--id-success-soft)] text-[var(--id-success)] ring-[var(--id-success)]/30",
                      active &&
                        "scale-105 bg-[var(--id-accent-soft)] text-[var(--id-accent-text)] ring-[var(--id-accent)]/40 shadow-[var(--id-shadow)]",
                      !done &&
                        !active &&
                        "bg-[var(--id-surface-muted)] text-[var(--id-text-faint)] ring-[var(--id-border)]"
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <p
                    className={cn(
                      "mt-2 text-[10px] font-semibold uppercase tracking-wide sm:text-xs",
                      active ? "text-[var(--id-text)]" : "text-[var(--id-text-muted)]"
                    )}
                  >
                    {item.label}
                  </p>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-px flex-1 transition-colors duration-300",
                      done ? "bg-[var(--id-accent)]/50" : "bg-[var(--id-border)]"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow-lg)]">
        {step === 1 && (
          <StepPanel
            title="Trading experience"
            subtitle="Help us understand your background before the evaluation."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Trading experience *">
                <Input
                  value={basicInfo.tradingExperience ?? ""}
                  onChange={(e) =>
                    setBasicInfo((b) => ({ ...b, tradingExperience: e.target.value }))
                  }
                  placeholder="e.g. 3 years swing trading forex"
                  className={cryptoFlowInputClass}
                />
              </Field>
              <Field label="Years trading">
                <Input
                  type="number"
                  min={0}
                  value={basicInfo.yearsTrading ?? ""}
                  onChange={(e) =>
                    setBasicInfo((b) => ({
                      ...b,
                      yearsTrading: Number(e.target.value) || undefined,
                    }))
                  }
                  placeholder="Years"
                  className={cryptoFlowInputClass}
                />
              </Field>
              <Field label="Trading style" className="sm:col-span-2">
                <Input
                  value={basicInfo.tradingStyle ?? ""}
                  onChange={(e) =>
                    setBasicInfo((b) => ({ ...b, tradingStyle: e.target.value }))
                  }
                  placeholder="e.g. Swing, scalping, position"
                  className={cryptoFlowInputClass}
                />
              </Field>
            </div>
          </StepPanel>
        )}

        {step === 2 && (
          <StepPanel
            title="Markets & track record"
            subtitle="Share the markets you trade and your performance context."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Markets traded" className="sm:col-span-2">
                <Input
                  value={(basicInfo.marketsTraded ?? []).join(", ")}
                  onChange={(e) =>
                    setBasicInfo((b) => ({
                      ...b,
                      marketsTraded: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder="Forex, Crypto, Indices, Commodities"
                  className={cryptoFlowInputClass}
                />
              </Field>
              <Field label="Avg. monthly return (%)">
                <Input
                  type="number"
                  step="any"
                  value={basicInfo.averageMonthlyReturn ?? ""}
                  onChange={(e) =>
                    setBasicInfo((b) => ({
                      ...b,
                      averageMonthlyReturn: Number(e.target.value) || undefined,
                    }))
                  }
                  className={cryptoFlowInputClass}
                />
              </Field>
              <Field label="Previous capital managed ($)">
                <Input
                  type="number"
                  min={0}
                  value={basicInfo.previousCapitalManaged ?? ""}
                  onChange={(e) =>
                    setBasicInfo((b) => ({
                      ...b,
                      previousCapitalManaged: Number(e.target.value) || undefined,
                    }))
                  }
                  className={cryptoFlowInputClass}
                />
              </Field>
              <Field label="Previous experience" className="sm:col-span-2">
                <Textarea
                  value={basicInfo.previousExperience ?? ""}
                  onChange={(e) =>
                    setBasicInfo((b) => ({ ...b, previousExperience: e.target.value }))
                  }
                  rows={4}
                  placeholder="Prop firms, copy trading, fund management, etc."
                  className={cryptoFlowTextareaClass}
                />
              </Field>
            </div>
          </StepPanel>
        )}

        {step === 3 && (
          <StepPanel
            title="Your profile"
            subtitle="A short professional summary for the review committee."
          >
            <div className="grid gap-4">
              <Field label="Country *">
                <Input
                  value={basicInfo.country ?? ""}
                  onChange={(e) => setBasicInfo((b) => ({ ...b, country: e.target.value }))}
                  placeholder="Country of residence"
                  className={cryptoFlowInputClass}
                />
              </Field>
              <Field label="Short biography *">
                <Textarea
                  value={basicInfo.biography ?? ""}
                  onChange={(e) => setBasicInfo((b) => ({ ...b, biography: e.target.value }))}
                  rows={5}
                  placeholder="Your trading journey, strengths, and why you want to manage a pool."
                  className={cryptoFlowTextareaClass}
                />
              </Field>
            </div>
          </StepPanel>
        )}

        {step === 4 && (
          <StepPanel
            title="Program requirements"
            subtitle="Review what comes after your application before starting the evaluation."
          >
            <div className="space-y-5">
              <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                  Your journey path
                </p>
                <ul className="mt-3 space-y-2">
                  {journeyPreview.map((stage, index) => (
                    <li
                      key={stage.id}
                      className="flex items-center gap-3 text-sm text-[var(--id-text-secondary)]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--id-surface-elevated)] text-xs font-semibold text-[var(--id-text-muted)]">
                        {index + 1}
                      </span>
                      {stage.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                  Evaluation rules preview
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Stat label="Profit target" value={`${challenge.profitTargetPct}%`} accent />
                  <Stat label="Duration" value={`${challenge.durationDays} days`} />
                  <Stat label="Fee" value={formatCurrency(challenge.price)} />
                </div>
                {challenge.rulesSummary && (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--id-text-secondary)]">
                    {challenge.rulesSummary}
                  </p>
                )}
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4 transition-colors hover:bg-[var(--id-surface-hover)]">
                <input
                  type="checkbox"
                  checked={requirementsAccepted}
                  onChange={(e) => setRequirementsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[var(--id-border)] accent-[var(--id-accent)]"
                />
                <span className="text-sm leading-relaxed text-[var(--id-text-secondary)]">
                  I understand the Manager Journey requirements and am ready to proceed to
                  the paid trader evaluation as the final step.
                </span>
              </label>
            </div>
          </StepPanel>
        )}

        {step === 5 && (
          <StepPanel
            title="RyvonX Trader Challenge"
            subtitle="Complete payment to begin your evaluation. This is the final step."
          >
            <ChallengeView
              challenge={challenge}
              enrollment={enrollment}
              availableBalance={availableBalance}
              embedded
            />
          </StepPanel>
        )}

        {step < 5 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--id-border)] px-5 py-4 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 1 || loading}
              onClick={goBack}
              className="text-[var(--id-text-secondary)] hover:bg-[var(--id-surface-hover)]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={goNext}
              className={cryptoFlowPrimaryButtonClass}
            >
              {loading ? "Saving…" : step === 4 ? "Continue to evaluation" : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link
          href={ROUTES.dashboard}
          className="inline-flex items-center text-sm text-[var(--id-text-muted)] transition-colors hover:text-[var(--id-accent-text)]"
        >
          <ChevronRight className="mr-1 h-4 w-4 rotate-180" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

function JourneyHeader() {
  return (
    <header className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--id-accent-text)]">
        RyvonX Pool Manager Program
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--id-text)] sm:text-[1.85rem]">
        Manager Journey
      </h1>
      <p className="mt-2 text-sm text-[var(--id-text-secondary)]">
        Your path to becoming a certified RyvonX Pool Manager — share your experience first,
        then complete the trader evaluation.
      </p>
    </header>
  );
}

function StepPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-6 sm:px-6 sm:py-7">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--id-text)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--id-text-muted)]">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--id-text-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular-nums",
          accent ? "text-[var(--id-success)]" : "text-[var(--id-text)]"
        )}
      >
        {value}
      </p>
    </div>
  );
}
