import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { tradingJournalService } from "@/services/trading-journal.service";
import { PmPageHeader, PmSectionCard } from "../workspace/pm-page-header";
import { PmStatusBadge } from "../workspace/pm-status-badge";

export async function PmJournalHub() {
  const cycles = await tradingJournalService.listTradableCyclesForManager();

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="Trading Journal"
        title="Journal"
        description="Select an active investment cycle to record trades, monitor positions, and capture operational snapshots."
      />

      {cycles.length === 0 ? (
        <PmSectionCard title="No operational cycles">
          <p className="text-sm text-navy-400">
            Trading journals become available when a cycle enters the trading phase. Create or
            transition a cycle from the Investment Cycles workspace.
          </p>
          <Link
            href={ROUTES.poolManagerInvestmentCycles}
            className="mt-4 inline-block text-sm text-amber-300/80 hover:text-amber-200"
          >
            View investment cycles →
          </Link>
        </PmSectionCard>
      ) : (
        <PmSectionCard title="Active & completed cycles">
          <ul className="divide-y divide-white/[0.06]">
            {cycles.map((c) => (
              <li key={c.cycleId} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium text-white">{c.cycleName}</p>
                  <p className="text-xs text-navy-500">
                    {INVESTMENT_CYCLE_STATUS_LABELS[c.cycleStatus as keyof typeof INVESTMENT_CYCLE_STATUS_LABELS] ??
                      c.cycleStatus}
                    {c.journalId ? " · Journal active" : " · Journal not opened"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <PmStatusBadge
                    status={c.cycleStatus}
                    label={
                      INVESTMENT_CYCLE_STATUS_LABELS[
                        c.cycleStatus as keyof typeof INVESTMENT_CYCLE_STATUS_LABELS
                      ] ?? c.cycleStatus
                    }
                  />
                  <Link
                    href={`${ROUTES.poolManagerInvestmentCycles}/${c.cycleId}/journal`}
                    className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-500/10"
                  >
                    Open Journal
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </PmSectionCard>
      )}
    </div>
  );
}
