"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { InvestmentCycle } from "@/domain/investment/types";
import { PmPageHeader, PmSectionCard } from "./pm-page-header";
import { PmStatusBadge } from "./pm-status-badge";
import { PmFundingProgress } from "./pm-funding-progress";

export function PmCyclesClient({ initialCycles }: { initialCycles: InvestmentCycle[] }) {
  const draft = initialCycles.filter((c) => c.status === "draft");
  const submitted = initialCycles.filter((c) => c.status === "submitted");
  const active = initialCycles.filter((c) =>
    ["approved", "funding", "trading", "distribution"].includes(c.status)
  );
  const closed = initialCycles.filter((c) => ["completed", "archived"].includes(c.status));

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="Investment Cycles"
        title="Investment Cycles"
        description="Create fundraising and trading periods under your approved strategies."
        actions={
          <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
            <Link href={`${ROUTES.poolManagerInvestmentCycles}/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Cycle
            </Link>
          </Button>
        }
      />

      <CycleGroup title="Draft" items={draft} />
      <CycleGroup title="Submitted" items={submitted} />
      <CycleGroup title="Active" items={active} showFunding />
      <CycleGroup title="Closed" items={closed} />
    </div>
  );
}

function CycleGroup({
  title,
  items,
  showFunding = false,
}: {
  title: string;
  items: InvestmentCycle[];
  showFunding?: boolean;
}) {
  return (
    <PmSectionCard title={title}>
      {items.length === 0 ? (
        <p className="text-sm text-navy-500">None</p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {items.map((c) => (
            <li key={c.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`${ROUTES.poolManagerInvestmentCycles}/${c.id}`}
                    className="font-medium text-white hover:text-amber-200"
                  >
                    {c.name}
                  </Link>
                  <p className="mt-1 text-xs text-navy-500">
                    {formatCurrency(c.raisedCapital)} raised · {c.investorCount} investors
                  </p>
                </div>
                <PmStatusBadge
                  label={INVESTMENT_CYCLE_STATUS_LABELS[c.status]}
                  status={c.status}
                />
              </div>
              {showFunding && c.status === "funding" && (
                <div className="mt-4">
                  <PmFundingProgress
                    raised={c.raisedCapital}
                    target={c.targetCapital}
                    investorCount={c.investorCount}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </PmSectionCard>
  );
}
