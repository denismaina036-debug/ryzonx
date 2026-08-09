"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { Button } from "@/components/ui/button";
import type { InvestmentCycle } from "@/domain/investment/types";
import { PmPageHeader, PmSectionCard } from "./pm-page-header";
import { PmStatusBadge } from "./pm-status-badge";
import { PmCycleListSections } from "./pm-cycle-list-sections";

export function PmCyclesClient({ initialCycles }: { initialCycles: InvestmentCycle[] }) {
  const otherCycles = initialCycles.filter(
    (cycle) =>
      !["approved", "funding", "trading", "distribution"].includes(cycle.status)
  );

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="Investment Cycles"
        title="Investment Cycles"
        description="Funding and trading cycles across your pools."
        actions={
          <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
            <Link href={ROUTES.poolManagerNewCycle}>
              <Plus className="mr-2 h-4 w-4" />
              New Cycle
            </Link>
          </Button>
        }
      />

      <PmCycleListSections cycles={initialCycles} />

      {otherCycles.length > 0 && (
        <PmSectionCard title="Other Cycles" description="Draft, submitted, and completed cycles">
          <ul className="divide-y divide-[var(--id-border)]">
            {otherCycles.map((cycle) => (
              <li key={cycle.id} className="flex items-center justify-between gap-3 py-3">
                <Link
                  href={`${ROUTES.poolManagerInvestmentCycles}/${cycle.id}`}
                  className="min-w-0 truncate text-sm font-medium text-[var(--id-text)] hover:text-[var(--pm-accent-text)]"
                >
                  {cycle.name}
                </Link>
                <PmStatusBadge
                  label={INVESTMENT_CYCLE_STATUS_LABELS[cycle.status]}
                  status={cycle.status}
                />
              </li>
            ))}
          </ul>
        </PmSectionCard>
      )}
    </div>
  );
}
