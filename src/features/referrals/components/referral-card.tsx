"use client";

import { useState } from "react";
import { Check, Copy, Gift, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { ReferralSummary } from "@/domain/referrals/types";

export function ReferralCard({
  summary,
  className,
  compact = false,
}: {
  summary: ReferralSummary;
  className?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(summary.referralLink);
    setCopied(true);
    toast.success("Referral link copied.");
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({
        title: "Join me on RyvonX",
        text: "Explore verified investment pools on RyvonX.",
        url: summary.referralLink,
      });
      return;
    }
    await copyLink();
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface)] shadow-sm",
        className
      )}
      aria-labelledby="referral-program-title"
    >
      <div className={cn("relative", compact ? "p-4" : "p-5")}>
        <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-royal-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-500/10 text-royal-500">
              <Gift className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="referral-program-title" className="font-semibold text-[var(--id-text)]">
                Refer &amp; earn
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-[var(--id-text-muted)]">
                Earn {formatCurrency(summary.rewardAmount)} when a friend joins and makes their
                first pool investment.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex min-w-0 items-center gap-2 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-2">
          <span className="min-w-0 flex-1 truncate px-1 text-xs font-medium text-[var(--id-text-muted)]">
            {summary.referralLink}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 shrink-0 px-3"
            onClick={() => void copyLink().catch(() => toast.error("Could not copy the link."))}
            aria-label="Copy referral link"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="ml-1.5 hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 px-3"
            onClick={() => void shareLink().catch(() => undefined)}
          >
            <Share2 className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Share</span>
          </Button>
        </div>

        <div className="relative mt-4 grid grid-cols-2 divide-x divide-[var(--id-border)] rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] py-3">
          <div className="px-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--id-text-faint)]">
              Total rewards
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-500">
              {formatCurrency(summary.totalReferralRewards)}
            </p>
          </div>
          <div className="px-3">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--id-text-faint)]">
              <Users className="h-3 w-3" /> Rewarded
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--id-text)]">
              {summary.successfulReferrals}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
