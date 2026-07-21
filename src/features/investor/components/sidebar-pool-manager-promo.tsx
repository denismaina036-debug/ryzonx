import Link from "next/link";
import { ArrowRight, Medal } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { CHALLENGE_DISPLAY_STATUS, type ChallengeDisplayStatus } from "@/domain/challenge/types";
import {
  pmJourneyCardCta,
  pmJourneyCardTitle,
  type PmJourneyCardVariant,
} from "@/domain/investor/pm-journey-variant";

interface SidebarPoolManagerPromoProps {
  pmJourneyVariant?: PmJourneyCardVariant;
  challengeDisplayStatus?: ChallengeDisplayStatus;
}

export function SidebarPoolManagerPromo({
  pmJourneyVariant = "hidden",
  challengeDisplayStatus,
}: SidebarPoolManagerPromoProps) {
  if (pmJourneyVariant === "hidden") {
    return null;
  }

  if (challengeDisplayStatus && challengeDisplayStatus !== CHALLENGE_DISPLAY_STATUS.NONE) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[var(--id-border)] bg-gradient-to-br from-[var(--id-accent-soft)] to-[var(--id-surface-muted)] p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--id-accent)]/20">
        <Medal className="h-4 w-4 text-[var(--id-accent-text)]" strokeWidth={1.75} />
      </div>
      <p className="mt-3 text-sm font-semibold text-[var(--id-text)]">
        {pmJourneyCardTitle(pmJourneyVariant)}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--id-text-secondary)]">
        {pmJourneyVariant === "continue"
          ? "Pick up where you left off in your Pool Manager application."
          : "Submit one application. After approval, launch strategies and investment cycles immediately."}
      </p>
      <Link
        href={ROUTES.applyPoolManager}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--id-accent)] px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        {pmJourneyCardCta(pmJourneyVariant)}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </div>
  );
}
