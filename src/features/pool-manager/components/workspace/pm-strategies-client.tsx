"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { STRATEGY_STATUS_LABELS } from "@/constants/strategy";
import { Button } from "@/components/ui/button";
import type { Strategy } from "@/domain/investment/types";
import { PmPageHeader, PmSectionCard } from "./pm-page-header";
import { PmStatusBadge } from "./pm-status-badge";
import { Plus } from "lucide-react";

export function PmStrategiesClient({ initialStrategies }: { initialStrategies: Strategy[] }) {
  const draft = initialStrategies.filter((s) => s.status === "draft");
  const submitted = initialStrategies.filter(
    (s) => s.status === "submitted" || s.status === "under_review"
  );
  const active = initialStrategies.filter((s) =>
    ["approved", "available", "operating", "paused"].includes(s.status)
  );
  const archived = initialStrategies.filter((s) => s.status === "archived");

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="Strategy Management"
        title="Strategies"
        description="Define permanent investment methodologies. Strategies are reviewed by RyvonX before going live."
        actions={
          <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
            <Link href={`${ROUTES.poolManagerStrategies}/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Strategy
            </Link>
          </Button>
        }
      />

      <StrategyGroup title="Draft" items={draft} empty="No draft strategies." />
      <StrategyGroup title="Submitted / Under Review" items={submitted} empty="Nothing pending review." />
      <StrategyGroup title="Active" items={active} empty="No active strategies yet." />
      <StrategyGroup title="Archived" items={archived} empty="No archived strategies." />
    </div>
  );
}

function StrategyGroup({
  title,
  items,
  empty,
}: {
  title: string;
  items: Strategy[];
  empty: string;
}) {
  return (
    <PmSectionCard title={title}>
      {items.length === 0 ? (
        <p className="text-sm text-navy-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {items.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <Link
                  href={`${ROUTES.poolManagerStrategies}/${s.id}`}
                  className="font-medium text-white hover:text-amber-200"
                >
                  {s.name}
                </Link>
                {s.investmentStyle && (
                  <p className="mt-0.5 text-xs text-navy-500">{s.investmentStyle}</p>
                )}
              </div>
              <PmStatusBadge label={STRATEGY_STATUS_LABELS[s.status]} status={s.status} />
            </li>
          ))}
        </ul>
      )}
    </PmSectionCard>
  );
}
