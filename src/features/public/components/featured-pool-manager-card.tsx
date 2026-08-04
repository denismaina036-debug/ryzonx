import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { FeaturedLandingPoolManager } from "@/domain/landing-page/types";

interface FeaturedPoolManagerCardProps {
  manager: FeaturedLandingPoolManager;
  highlighted?: boolean;
}

export function FeaturedPoolManagerCard({
  manager,
  highlighted = false,
}: FeaturedPoolManagerCardProps) {
  const poolHref = manager.poolSlug
    ? `${ROUTES.marketplace}/${manager.poolSlug}`
    : manager.slug
      ? `${ROUTES.managerPublicProfile}/${manager.slug}`
      : ROUTES.marketplace;

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border bg-card p-6 transition-all duration-500 ${
        highlighted
          ? "border-royal-300 shadow-md shadow-royal-100/60"
          : "border-border hover:border-royal-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border bg-royal-50">
          {manager.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={manager.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-lg font-bold text-royal-700">
              {manager.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {manager.isVerified ? (
            <BadgeCheck
              className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-card text-royal-600"
              aria-label="Verified"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-navy-950">{manager.displayName}</h3>
          <p className="mt-0.5 truncate text-sm text-navy-500">{manager.poolName}</p>
          {manager.strategy ? (
            <p className="mt-1 text-xs capitalize text-navy-400">{manager.strategy.replace(/_/g, " ")}</p>
          ) : null}
        </div>

        {manager.rating != null ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {manager.rating.toFixed(1)}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Capital Managed" value={formatCurrency(manager.capitalManaged)} />
        <Metric label="Investors" value={String(manager.investorCount)} />
        <Metric label="Win Rate" value={manager.winRatePct != null ? formatPercentage(manager.winRatePct) : "—"} />
        <Metric label="Rating" value={manager.rating != null ? manager.rating.toFixed(1) : "—"} />
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={poolHref}>View Pool</Link>
        </Button>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-navy-400">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-navy-950">{value}</p>
    </div>
  );
}
