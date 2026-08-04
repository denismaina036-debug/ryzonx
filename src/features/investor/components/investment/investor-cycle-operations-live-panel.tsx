"use client";

import { useCallback, useEffect, useState } from "react";
import type { InvestorCycleOperationsView } from "@/domain/trading-journal/types";
import { useIntervalRefresh } from "@/hooks/use-interval-refresh";
import { InvestorCycleOperationsPanel } from "./investor-cycle-operations-panel";

export function InvestorCycleOperationsLivePanel({
  cycleSlug,
  initialOperations,
}: {
  cycleSlug: string;
  initialOperations: InvestorCycleOperationsView;
}) {
  const [operations, setOperations] = useState(initialOperations);
  const isTrading = initialOperations.simplifiedPhase === "trading";

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/investor/investment-cycles/${cycleSlug}/progress`);
    const data = (await res.json()) as {
      progress?: InvestorCycleOperationsView;
      error?: string;
    };
    if (res.ok && data.progress) {
      setOperations(data.progress);
    }
  }, [cycleSlug]);

  useEffect(() => {
    setOperations(initialOperations);
  }, [initialOperations]);

  useIntervalRefresh(refresh, 12_000, isTrading);

  return <InvestorCycleOperationsPanel operations={operations} />;
}
