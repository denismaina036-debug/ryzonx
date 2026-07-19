"use client";

import Link from "next/link";
import { ArrowRight, Check, Route } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import {
  MANAGER_JOURNEY_STAGES,
  getManagerJourneyProgress,
} from "@/features/investor/constants/manager-journey";
import type { ChallengeEnrollment } from "@/features/investor/types";

const STEPPER_STAGES = MANAGER_JOURNEY_STAGES.slice(0, 5);

export function MobileManagerJourney({
  enrollment,
}: {
  enrollment: ChallengeEnrollment | null;
}) {
  const { currentStageIndex, nextStep } = getManagerJourneyProgress(
    enrollment?.status
  );
  const clampedIndex = Math.min(currentStageIndex, STEPPER_STAGES.length - 1);
  const progressPct = (clampedIndex / (STEPPER_STAGES.length - 1)) * 100;

  return (
    <section className="rounded-2xl bg-[var(--id-surface)] p-4 shadow-[var(--id-shadow)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]">
            <Route className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <h2 className="text-sm font-semibold text-[var(--id-text)]">Manager Journey</h2>
        </div>
        <Link
          href={ROUTES.applyPoolManager}
          className="text-xs font-medium text-[var(--id-accent-text)] hover:underline"
        >
          View
        </Link>
      </div>

      <div className="relative mt-4 flex items-center justify-between px-0.5">
        <div
          className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-[var(--id-border-strong)]"
          aria-hidden
        />
        <div
          className="absolute left-3 top-1/2 h-px -translate-y-1/2 bg-[var(--id-accent)] transition-all duration-700"
          style={{ width: `calc((100% - 1.5rem) * ${progressPct / 100})` }}
          aria-hidden
        />
        {STEPPER_STAGES.map((stage, index) => {
          const done = index < clampedIndex;
          const active = index === clampedIndex;
          return (
            <span
              key={stage.id}
              className={cn(
                "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[9px] font-semibold",
                done && "border-[var(--id-accent)] bg-[var(--id-accent)] text-white",
                active &&
                  "border-[var(--id-accent)] bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]",
                !done &&
                  !active &&
                  "border-[var(--id-border-strong)] bg-[var(--id-surface-muted)] text-[var(--id-text-faint)]"
              )}
            >
              {done ? <Check className="h-3 w-3" strokeWidth={2.5} /> : index + 1}
            </span>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] font-medium text-[var(--id-text-muted)]">Next step</p>
      <p className="mt-0.5 text-xs leading-relaxed text-[var(--id-text-secondary)]">
        {nextStep}
      </p>

      <Link
        href={ROUTES.applyPoolManager}
        className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--id-accent)] text-xs font-semibold text-white transition-opacity active:opacity-90"
      >
        Continue Journey
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
      </Link>
    </section>
  );
}
