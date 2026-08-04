"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { InvestorCycleOperationsView } from "@/domain/trading-journal/types";

export function useCycleProgressLive({
  cycleId,
  cycleSlug,
  initialOperations,
  enabled = true,
}: {
  cycleId: string;
  cycleSlug: string;
  initialOperations: InvestorCycleOperationsView;
  enabled?: boolean;
}) {
  const [operations, setOperations] = useState(initialOperations);
  const [isLive, setIsLive] = useState(false);
  const refreshInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const res = await fetch(`/api/investor/investment-cycles/${cycleSlug}/progress`);
      const data = (await res.json()) as {
        progress?: InvestorCycleOperationsView;
      };
      if (res.ok && data.progress) {
        setOperations(data.progress);
      }
    } finally {
      refreshInFlight.current = false;
    }
  }, [cycleSlug]);

  useEffect(() => {
    setOperations(initialOperations);
  }, [initialOperations]);

  useEffect(() => {
    if (!enabled || !cycleId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`cycle-progress-${cycleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cycle_progress_events",
          filter: `investment_cycle_id=eq.${cycleId}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cycleId, enabled, refresh]);

  return { operations, isLive, refresh };
}
