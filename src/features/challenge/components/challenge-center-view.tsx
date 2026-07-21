"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { CHALLENGE_DISPLAY_STATUS, type ChallengeCenterState } from "@/domain/challenge/types";
import { ChallengeAccountCard } from "@/features/challenge/components/challenge-account-card";
import { ChallengeDashboard } from "@/features/challenge/components/challenge-dashboard";
import { ChallengeJournal } from "@/features/challenge/components/challenge-journal";
import { ChallengeTemplateDetails } from "@/features/challenge/components/challenge-template-details";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  waiting: "Waiting",
  active: "Active",
  completed: "Completed",
  passed: "Passed",
  failed: "Failed",
  rejected: "Rejected",
  none: "Not Started",
};

const STATUS_STYLES: Record<string, string> = {
  waiting: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  passed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  none: "bg-[var(--id-surface-elevated)] text-[var(--id-text-muted)] border-[var(--id-border)]",
};

interface ChallengeCenterViewProps {
  initialState?: ChallengeCenterState;
}

export function ChallengeCenterView({ initialState }: ChallengeCenterViewProps) {
  const [state, setState] = useState<ChallengeCenterState | null>(initialState ?? null);
  const [loading, setLoading] = useState(!initialState);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/investor/challenge-center");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setState(data as ChallengeCenterState);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialState) void refresh();
  }, [initialState, refresh]);

  async function handleStartChallenge() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/investor/challenge-center/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setState(data as ChallengeCenterState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start challenge");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--id-accent-text)]" />
      </div>
    );
  }

  if (!state || state.displayStatus === CHALLENGE_DISPLAY_STATUS.NONE) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--id-accent-soft)]">
          <Trophy className="h-7 w-7 text-[var(--id-accent-text)]" strokeWidth={1.5} />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-[var(--id-text)]">Challenge Center</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--id-text-secondary)]">
          Apply to become a Pool Manager. Once your application is reviewed and challenge credentials
          are assigned, your Challenge Center will appear here.
        </p>
        <Button asChild className="mt-6 rounded-xl bg-[var(--id-accent)] text-white">
          <Link href={ROUTES.applyPoolManager}>
            Apply Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  const { enrollment, challenge, template, statistics, displayStatus } = state;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--id-text-muted)]">
            Pool Manager Challenge
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--id-text)]">
            {template?.name ?? challenge?.title ?? "Challenge Center"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--id-text-secondary)]">
            Complete your trading challenge to qualify for Pool Manager approval. Every trade is
            reviewed by the administration team before counting toward your progress.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold capitalize",
            STATUS_STYLES[displayStatus] ?? STATUS_STYLES.none
          )}
        >
          {STATUS_LABELS[displayStatus] ?? displayStatus}
        </span>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {state.canStart && enrollment && challenge && (
        <div className="rounded-2xl border border-[var(--id-accent)]/30 bg-gradient-to-br from-[var(--id-accent-soft)] to-[var(--id-surface-muted)] p-6">
          <h2 className="text-lg font-semibold text-[var(--id-text)]">Ready to begin?</h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--id-text-secondary)]">
            Your challenge account has been assigned. Click Start Challenge when you are ready to
            begin recording trades. Trading days begin counting from this moment.
          </p>
          <Button
            className="mt-4 rounded-xl bg-[var(--id-accent)] px-6 text-white hover:opacity-90"
            onClick={() => void handleStartChallenge()}
            disabled={starting}
          >
            {starting ? "Starting…" : "Start Challenge"}
          </Button>
        </div>
      )}

      {enrollment && challenge && (
        <ChallengeAccountCard
          enrollment={enrollment}
          challenge={challenge}
          template={template}
          currentTradingDay={statistics?.currentTradingDay ?? 0}
        />
      )}

      {template && <ChallengeTemplateDetails template={template} />}

      {statistics && (
        <section className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-6">
          <ChallengeDashboard statistics={statistics} displayStatus={displayStatus} />
        </section>
      )}

      {enrollment && (
        <section className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-6">
          <ChallengeJournal
            trades={state.trades}
            canSubmit={state.canSubmitTrades}
            enrollmentId={enrollment.id}
            currentTradingDay={statistics?.currentTradingDay ?? 1}
            onRefresh={() => void refresh()}
          />
        </section>
      )}
    </div>
  );
}
