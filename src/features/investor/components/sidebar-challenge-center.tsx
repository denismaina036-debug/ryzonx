"use client";

import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";
import { CHALLENGE_DISPLAY_STATUS, type ChallengeDisplayStatus } from "@/domain/challenge/types";

interface SidebarChallengeCenterProps {
  userRole?: string;
  challengeDisplayStatus?: ChallengeDisplayStatus;
}

export function SidebarChallengeCenter({
  userRole,
  challengeDisplayStatus,
}: SidebarChallengeCenterProps) {
  if (
    userRole === USER_ROLES.POOL_MANAGER ||
    userRole === USER_ROLES.ADMINISTRATOR
  ) {
    return null;
  }

  if (
    !challengeDisplayStatus ||
    challengeDisplayStatus === CHALLENGE_DISPLAY_STATUS.NONE
  ) {
    return null;
  }

  const isActive = challengeDisplayStatus === CHALLENGE_DISPLAY_STATUS.ACTIVE;

  return (
    <div className="rounded-2xl border border-[var(--id-border)] bg-gradient-to-br from-violet-500/10 to-[var(--id-surface-muted)] p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20">
        <Trophy className="h-4 w-4 text-violet-300" strokeWidth={1.75} />
      </div>
      <p className="mt-3 text-sm font-semibold text-[var(--id-text)]">Challenge Center</p>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--id-text-secondary)]">
        {isActive
          ? "Your challenge is active. Record trades and track progress."
          : "Your challenge credentials are ready. Open the Challenge Center to begin."}
      </p>
      <Link
        href={ROUTES.challenge}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--id-accent)] px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        Open Challenge Center
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </div>
  );
}
