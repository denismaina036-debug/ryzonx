"use client";

import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import {
  DashboardCard,
  dashboardCardBodyClass,
} from "@/features/investor/components/dashboard-card";
import { CHALLENGE_DISPLAY_STATUS, type ChallengeDisplayStatus } from "@/domain/challenge/types";

interface ChallengeCenterCardProps {
  displayStatus: ChallengeDisplayStatus;
  progressPct?: number;
}

const STATUS_COPY: Record<string, { title: string; description: string; cta: string }> = {
  waiting: {
    title: "Challenge Ready",
    description: "Your challenge account has been assigned. Start when you are ready.",
    cta: "Open Challenge Center",
  },
  active: {
    title: "Challenge Active",
    description: "Record trades in your journal and track progress toward your profit target.",
    cta: "Continue Challenge",
  },
  completed: {
    title: "Challenge Complete",
    description: "You met the challenge criteria. Awaiting final administrator approval.",
    cta: "View Progress",
  },
  passed: {
    title: "Challenge Passed",
    description: "Congratulations — your challenge was passed. Awaiting Pool Manager approval.",
    cta: "View Challenge",
  },
  failed: {
    title: "Challenge Not Passed",
    description: "Review your challenge results or contact support for next steps.",
    cta: "View Challenge",
  },
};

export function ChallengeCenterCard({
  displayStatus,
  progressPct = 0,
}: ChallengeCenterCardProps) {
  if (displayStatus === CHALLENGE_DISPLAY_STATUS.NONE) return null;

  const copy =
    STATUS_COPY[displayStatus] ??
    ({
      title: "Challenge Center",
      description: "Track your Pool Manager challenge progress.",
      cta: "Open Challenge Center",
    } as const);

  return (
    <DashboardCard title="Pool Manager Challenge">
      <div className={dashboardCardBodyClass}>
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
            <Trophy className="h-6 w-6 text-violet-300" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--id-text)]">{copy.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--id-text-secondary)]">
              {copy.description}
            </p>
            {displayStatus === CHALLENGE_DISPLAY_STATUS.ACTIVE && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-[var(--id-text-muted)]">
                  <span>Progress</span>
                  <span>{progressPct.toFixed(0)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--id-surface-elevated)]">
                  <div
                    className="h-full rounded-full bg-[var(--id-accent)]"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Button
          asChild
          className="mt-4 h-10 w-full rounded-xl bg-[var(--id-accent)] text-sm font-semibold text-white hover:opacity-90"
        >
          <Link href={ROUTES.challenge}>
            {copy.cta}
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.75} />
          </Link>
        </Button>
      </div>
    </DashboardCard>
  );
}
