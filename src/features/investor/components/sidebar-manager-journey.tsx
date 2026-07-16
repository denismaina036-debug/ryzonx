"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  MANAGER_JOURNEY_STAGES,
  getManagerJourneyProgress,
} from "@/features/investor/constants/manager-journey";
import { DashboardProgressBar } from "@/features/investor/components/dashboard-card";
import type { ChallengeEnrollmentStatus } from "@/features/investor/types";

export function SidebarManagerJourney() {
  const [status, setStatus] = useState<ChallengeEnrollmentStatus | null>(null);

  useEffect(() => {
    fetch("/api/investor/challenge")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.enrollment?.status) {
          setStatus(data.enrollment.status);
        }
      })
      .catch(() => {});
  }, []);

  const { currentStageIndex, nextStep } = getManagerJourneyProgress(status);
  const progressPct = Math.round(
    ((currentStageIndex + 1) / MANAGER_JOURNEY_STAGES.length) * 100
  );
  const currentStage =
    MANAGER_JOURNEY_STAGES[currentStageIndex]?.label ?? "Application";

  return (
    <div className="rounded-2xl bg-[var(--id-surface-elevated)] p-4 shadow-[var(--id-shadow)]">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--id-text-muted)]">
        Manager Journey
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--id-text)]">{currentStage}</p>
      <div className="mt-3">
        <DashboardProgressBar value={progressPct} glow="royal" />
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--id-text-secondary)]">
          {nextStep}
        </p>
      </div>
      <Link
        href={ROUTES.managerJourney}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--id-accent-text)] transition-opacity hover:opacity-80"
      >
        Continue
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </div>
  );
}
