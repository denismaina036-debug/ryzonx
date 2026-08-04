"use client";

import type { InvestorCycleOperationsView } from "@/domain/trading-journal/types";
import { useCycleProgressLive } from "@/hooks/use-cycle-progress-live";
import { InvestorCycleOperationsPanel } from "./investor-cycle-operations-panel";

export function InvestorCycleOperationsLivePanel({
  cycleSlug,
  cycleId,
  initialOperations,
}: {
  cycleSlug: string;
  cycleId?: string;
  initialOperations: InvestorCycleOperationsView;
}) {
  const isTrading = initialOperations.simplifiedPhase === "trading";
  const resolvedCycleId = cycleId ?? "";

  const { operations, isLive } = useCycleProgressLive({
    cycleId: resolvedCycleId,
    cycleSlug,
    initialOperations,
    enabled: isTrading && Boolean(resolvedCycleId),
  });

  const displayOperations =
    isTrading && resolvedCycleId ? operations : initialOperations;

  return (
    <InvestorCycleOperationsPanel
      operations={displayOperations}
      live={isTrading && isLive}
    />
  );
}
