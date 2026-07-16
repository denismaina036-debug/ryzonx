"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS, STALE_TIMES } from "@/constants/routes";
import { poolService } from "@/services/pool.service";
import type { PoolStats } from "@/types";

export function usePoolStats() {
  return useQuery<PoolStats>({
    queryKey: QUERY_KEYS.pool.stats,
    queryFn: () => poolService.getStats(),
    staleTime: STALE_TIMES.realtime,
  });
}

export function usePoolPerformance(period: "daily" | "weekly" | "monthly" = "daily") {
  return useQuery({
    queryKey: [...QUERY_KEYS.pool.performance, period],
    queryFn: () => poolService.getPerformanceHistory(period),
    staleTime: STALE_TIMES.standard,
  });
}

export function useRefreshPoolStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pool.all });
    },
  });
}
