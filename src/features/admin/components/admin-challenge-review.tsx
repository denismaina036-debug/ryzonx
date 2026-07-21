"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import { ChallengeDashboard } from "@/features/challenge/components/challenge-dashboard";
import { ChallengeAccountCard } from "@/features/challenge/components/challenge-account-card";
import {
  CHALLENGE_TRADE_STATUS,
  type ChallengeCenterState,
  type ChallengeTrade,
} from "@/domain/challenge/types";
import { cn } from "@/lib/utils";

interface AdminChallengeReviewProps {
  initialState: ChallengeCenterState & {
    applicantName: string;
    applicantEmail: string;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function AdminChallengeReview({ initialState }: AdminChallengeReviewProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrollmentId = state.enrollment?.id;

  async function reviewTrade(trade: ChallengeTrade, action: "approve" | "reject") {
    if (!enrollmentId) return;
    if (action === "reject" && !rejectReason.trim()) {
      setError("Rejection reason is required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/challenge-review/trades/${trade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewNotes: notes.trim() || undefined,
          rejectionReason: action === "reject" ? rejectReason.trim() : undefined,
          enrollmentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.state) setState(data.state);
      else router.refresh();
      setReviewingId(null);
      setRejectReason("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setLoading(false);
    }
  }

  async function markOutcome(outcome: "passed" | "failed") {
    if (!enrollmentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/challenge-review/${enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setState(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  const pending = state.trades.filter((t) => t.status === CHALLENGE_TRADE_STATUS.PENDING_REVIEW);
  const approved = state.trades.filter((t) => t.status === CHALLENGE_TRADE_STATUS.APPROVED);
  const rejected = state.trades.filter((t) => t.status === CHALLENGE_TRADE_STATUS.REJECTED);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-navy-500">
            Challenge Review
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-navy-900">{state.applicantName}</h2>
          <p className="text-sm text-navy-500">{state.applicantEmail}</p>
          {state.applicationId && (
            <Link
              href={`${ROUTES.adminPoolManagersApplications}?selected=${state.applicationId}`}
              className="mt-2 inline-block text-xs font-medium text-royal-600 hover:underline"
            >
              View application
            </Link>
          )}
        </div>
        <span className="inline-flex rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-semibold capitalize text-navy-700">
          {state.displayStatus}
        </span>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {state.enrollment && state.challenge && state.statistics && (
        <>
          <ChallengeAccountCard
            enrollment={state.enrollment}
            challenge={state.challenge}
            template={state.template}
            currentTradingDay={state.statistics.currentTradingDay}
          />

          <div className="rounded-xl border border-navy-100 bg-white p-6">
            <ChallengeDashboard
              statistics={state.statistics}
              displayStatus={state.displayStatus}
            />
          </div>
        </>
      )}

      <section className="rounded-xl border border-navy-100 bg-white p-6">
        <h3 className="text-sm font-semibold text-navy-900">
          Pending Trades ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-navy-500">No trades awaiting review.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {pending.map((trade) => (
              <div key={trade.id} className="rounded-lg border border-navy-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-navy-900">
                      {trade.instrument} · {trade.direction.toUpperCase()}
                    </p>
                    <p className="text-xs text-navy-500">
                      Day {trade.tradingDay} · {trade.tradeDate} · {trade.market ?? "—"}
                    </p>
                    <p className="mt-2 text-sm text-navy-600">
                      Entry {trade.entryPrice} → Exit {trade.exitPrice} · Lot {trade.lotSize}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-semibold",
                        trade.profitLoss >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}
                    >
                      {formatCurrency(trade.profitLoss)}
                    </p>
                    {trade.notes && (
                      <p className="mt-2 text-xs text-navy-500">{trade.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => void reviewTrade(trade, "approve")}
                      disabled={loading}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewingId(trade.id)}
                      disabled={loading}
                    >
                      Reject
                    </Button>
                  </div>
                </div>

                {reviewingId === trade.id && (
                  <div className="mt-4 space-y-3 border-t border-navy-100 pt-4">
                    <Textarea
                      placeholder="Rejection reason (required)…"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                    />
                    <Textarea
                      placeholder="Review notes (optional)…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void reviewTrade(trade, "reject")}
                        disabled={loading}
                      >
                        Confirm Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setReviewingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <TradeList title="Approved Trades" trades={approved} />
        <TradeList title="Rejected Trades" trades={rejected} showReason />
      </div>

      <section className="rounded-xl border border-navy-100 bg-white p-6">
        <h3 className="text-sm font-semibold text-navy-900">Challenge Outcome</h3>
        <p className="mt-1 text-xs text-navy-500">
          Mark the challenge as passed or failed after reviewing all trades and progress.
        </p>
        <Textarea
          className="mt-4"
          placeholder="Outcome notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => void markOutcome("passed")}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Mark Passed
          </Button>
          <Button
            variant="destructive"
            onClick={() => void markOutcome("failed")}
            disabled={loading}
          >
            Mark Failed
          </Button>
        </div>
      </section>
    </div>
  );
}

function TradeList({
  title,
  trades,
  showReason,
}: {
  title: string;
  trades: ChallengeTrade[];
  showReason?: boolean;
}) {
  return (
    <section className="rounded-xl border border-navy-100 bg-white p-6">
      <h3 className="text-sm font-semibold text-navy-900">
        {title} ({trades.length})
      </h3>
      {trades.length === 0 ? (
        <p className="mt-3 text-sm text-navy-500">None</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {trades.map((trade) => (
            <li key={trade.id} className="rounded-lg border border-navy-100 p-3 text-sm">
              <p className="font-medium text-navy-900">
                {trade.instrument} · {formatCurrency(trade.profitLoss)}
              </p>
              <p className="text-xs text-navy-500">
                {trade.tradeDate} · Day {trade.tradingDay}
              </p>
              {showReason && trade.rejectionReason && (
                <p className="mt-2 text-xs text-rose-600">{trade.rejectionReason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
