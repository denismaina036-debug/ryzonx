"use client";

import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Landmark, Users } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

interface MobilePrimaryActionsProps {
  hasActivePool: boolean;
}

export function MobilePrimaryActions({ hasActivePool }: MobilePrimaryActionsProps) {
  const primary = hasActivePool
    ? {
        label: "View My Pool",
        sub: "Your positions",
        href: ROUTES.investments,
        icon: Landmark,
      }
    : {
        label: "Join Pool",
        sub: "Explore pools",
        href: ROUTES.marketplace,
        icon: Users,
      };

  const PrimaryIcon = primary.icon;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      <Link
        href={primary.href}
        className="flex flex-col items-start justify-between gap-3 rounded-2xl p-3.5 text-white shadow-[var(--id-shadow)] [background:var(--id-accent-gradient)] transition-opacity active:opacity-90"
      >
        <PrimaryIcon className="h-5 w-5" strokeWidth={2} />
        <span className="min-w-0">
          <span className="block text-xs font-semibold leading-tight">{primary.label}</span>
          <span className="block truncate text-[10px] leading-tight text-white/70">
            {primary.sub}
          </span>
        </span>
      </Link>

      <SecondaryAction
        label="Add Funds"
        sub="Deposit now"
        href={ROUTES.deposits}
        icon={ArrowDownToLine}
      />
      <SecondaryAction
        label="Withdraw"
        sub="Get payout"
        href={ROUTES.withdrawals}
        icon={ArrowUpFromLine}
      />
    </div>
  );
}

function SecondaryAction({
  label,
  sub,
  href,
  icon: Icon,
  className,
}: {
  label: string;
  sub: string;
  href: string;
  icon: typeof ArrowDownToLine;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-start justify-between gap-3 rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface)] p-3.5 text-[var(--id-text)] shadow-[var(--id-shadow)] transition-colors active:bg-[var(--id-surface-hover)]",
        className
      )}
    >
      <Icon className="h-5 w-5 text-[var(--id-accent-text)]" strokeWidth={2} />
      <span className="min-w-0">
        <span className="block text-xs font-semibold leading-tight">{label}</span>
        <span className="block truncate text-[10px] leading-tight text-[var(--id-text-muted)]">
          {sub}
        </span>
      </span>
    </Link>
  );
}
