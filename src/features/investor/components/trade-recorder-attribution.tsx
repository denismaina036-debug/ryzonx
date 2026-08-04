import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { InvestorDashboardTrade } from "@/features/investor/types";

export function TradeRecorderAttribution({
  trade,
  className,
}: {
  trade: InvestorDashboardTrade;
  className?: string;
}) {
  if (!trade.poolManagerName && !trade.poolName) return null;

  const managerLabel = trade.poolManagerName ?? "Pool Manager";
  const managerHref = trade.poolManagerSlug
    ? `${ROUTES.managerPublicProfile}/${trade.poolManagerSlug}`
    : null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {trade.poolManagerPhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trade.poolManagerPhotoUrl}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-[var(--id-border)]"
        />
      ) : (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--id-surface-muted)] text-[10px] font-semibold text-[var(--id-text-muted)] ring-1 ring-[var(--id-border)]">
          {managerLabel.charAt(0)}
        </div>
      )}

      <div className="min-w-0 text-xs text-[var(--id-text-muted)]">
        {trade.poolName ? (
          <p className="truncate font-medium text-[var(--id-text-secondary)]">{trade.poolName}</p>
        ) : null}
        <p className="truncate">
          Recorded by{" "}
          {managerHref ? (
            <Link
              href={managerHref}
              className="font-medium text-[var(--id-accent-text)] hover:underline"
            >
              {managerLabel}
            </Link>
          ) : (
            <span className="font-medium text-[var(--id-text)]">{managerLabel}</span>
          )}
          <BadgeCheck
            className="ml-1 inline h-3.5 w-3.5 shrink-0 text-[var(--id-accent-text)]"
            aria-hidden
          />
        </p>
      </div>
    </div>
  );
}
