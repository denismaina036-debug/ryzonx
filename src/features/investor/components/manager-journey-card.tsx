"use client";

import Link from "next/link";
import { ArrowRight, Check, Flag, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import {
  DashboardCard,
  dashboardCardBodyClass,
} from "@/features/investor/components/dashboard-card";
import {
  MANAGER_JOURNEY_STAGES,
  getManagerJourneyProgress,
} from "@/features/investor/constants/manager-journey";
import type { ChallengeEnrollment } from "@/features/investor/types";

interface ManagerJourneyCardProps {
  enrollment: ChallengeEnrollment | null;
}

const STEPPER_STAGES = MANAGER_JOURNEY_STAGES.slice(0, 5);

export function ManagerJourneyCard({ enrollment }: ManagerJourneyCardProps) {
  const { currentStageIndex, nextStep } = getManagerJourneyProgress(
    enrollment?.status
  );
  const clampedIndex = Math.min(currentStageIndex, STEPPER_STAGES.length - 1);

  return (
    <DashboardCard
      title="Your Manager Journey"
      headerAction={
        <Link
          href={ROUTES.managerJourney}
          className="text-xs font-medium text-[var(--id-accent-text)] hover:underline"
        >
          View journey
        </Link>
      }
    >
      <div className={dashboardCardBodyClass}>
        <div className="relative flex items-center justify-between px-1">
          {STEPPER_STAGES.map((stage, index) => {
            const done = index < clampedIndex;
            const active = index === clampedIndex;
            return (
              <div key={stage.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-semibold",
                    done &&
                      "border-[var(--id-accent)] bg-[var(--id-accent)] text-white",
                    active &&
                      "border-[var(--id-accent)] bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]",
                    !done &&
                      !active &&
                      "border-[var(--id-border-strong)] bg-[var(--id-surface-muted)] text-[var(--id-text-faint)]"
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : (
                    index + 1
                  )}
                </div>
              </div>
            );
          })}
          <div
            className="absolute left-4 right-4 top-3.5 h-px bg-[var(--id-border-strong)]"
            aria-hidden
          />
        </div>

        <div className="mt-5 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-xs font-medium text-[var(--id-text-muted)]">Next Step</p>
              <p className="mt-1 text-sm font-semibold text-[var(--id-text)]">
                Submit Trading Strategy
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--id-text-secondary)]">
                {nextStep}
              </p>
              <ul className="mt-3 space-y-1 text-[11px] text-[var(--id-text-muted)]">
                <li>• Document your trading approach</li>
                <li>• Define risk parameters</li>
                <li>• Submit for committee review</li>
              </ul>
            </div>
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[var(--id-surface-elevated)]">
              <div className="relative">
                <Trophy className="h-8 w-8 text-[var(--id-accent-text)]" strokeWidth={1.5} />
                <Flag className="absolute -bottom-1 -right-1 h-4 w-4 text-[var(--id-text-faint)]" />
              </div>
            </div>
          </div>
        </div>

        <Button
          asChild
          className="mt-4 h-10 w-full rounded-xl bg-[var(--id-accent)] text-sm font-semibold text-white hover:opacity-90"
        >
          <Link href={ROUTES.managerJourney}>
            Continue Journey
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.75} />
          </Link>
        </Button>
      </div>
    </DashboardCard>
  );
}
