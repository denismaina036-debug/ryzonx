import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import type { InvestorPoolCyclesData } from "@/domain/investment/investor-presentation";
import { RyvonxPageHeader } from "@/features/investor/constants/ui";
import { PoolCycleFundingSection } from "./pool-cycle-funding-section";
import { PoolCycleTradingSection } from "./pool-cycle-trading-section";
import { PoolCycleClosedSection } from "./pool-cycle-closed-section";

export function InvestorPoolCyclesView({ data }: { data: InvestorPoolCyclesData }) {
  const hasContent = data.funding != null || data.trading != null || data.closed.length > 0;

  return (
    <div className="space-y-8">
      <RyvonxPageHeader
        title="Pool Cycles"
        description={
          data.context
            ? `${data.context.poolName} — funding, trading, and completed cycle history.`
            : "Track your pool cycle activity."
        }
      />

      {!hasContent && (
        <div className="rounded-[var(--id-radius)] border border-dashed border-[var(--id-border-strong)] bg-[var(--id-surface)] px-6 py-10 text-center">
          <p className="text-sm font-medium text-[var(--id-text)]">No pool cycles yet</p>
          <p className="mt-2 text-sm text-[var(--id-text-muted)]">
            When you join a pool cycle, funding progress, live trading, and completed history will
            appear here.
          </p>
          <Button asChild className="mt-6 rounded-xl [background:var(--id-accent-gradient)] text-white">
            <Link href={ROUTES.marketplace}>Explore pools</Link>
          </Button>
        </div>
      )}

      {data.funding && <PoolCycleFundingSection funding={data.funding} />}

      {data.trading && <PoolCycleTradingSection trading={data.trading} />}

      {data.closed.length > 0 && <PoolCycleClosedSection cycles={data.closed} />}

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={ROUTES.investments}>Current pool</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={ROUTES.marketplace}>Find opportunities</Link>
        </Button>
      </div>
    </div>
  );
}
