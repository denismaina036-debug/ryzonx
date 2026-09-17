export type OpenCopyCycleStatus =
  | "approved"
  | "funding"
  | "trading"
  | "distribution";

export type CopyStopMode =
  | "pending_cycle"
  | "immediate_funding"
  | "immediate_queue"
  | "immediate_completed"
  | "none";

export function resolveCurrentCopySessionId(input: {
  allocations: Array<{ copySessionId: string; startedAt: string }>;
  queues: Array<{ copySessionId: string; startedAt: string }>;
  starts?: Array<{ copySessionId: string; startedAt: string }>;
}): string | null {
  const candidates = [
    ...input.allocations.map((row) => ({ ...row, kind: "allocation" as const })),
    ...input.queues.map((row) => ({ ...row, kind: "queue" as const })),
    ...(input.starts ?? []).map((row) => ({ ...row, kind: "start" as const })),
  ].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return candidates[0]?.copySessionId ?? null;
}

export function resolveCopyStopMode(input: {
  cycleStatuses: OpenCopyCycleStatus[];
  queuedCapital: number;
  hasCompletedBalance: boolean;
}): CopyStopMode {
  if (input.cycleStatuses.some((status) => status === "trading" || status === "distribution")) {
    return "pending_cycle";
  }
  if (input.cycleStatuses.some((status) => status === "approved" || status === "funding")) {
    return "immediate_funding";
  }
  if (input.queuedCapital > 0) return "immediate_queue";
  if (input.hasCompletedBalance) return "immediate_completed";
  return "none";
}

export function resolveReturnableCopyCapital(input: {
  allocationAmount: number;
  returnedCapitalAmount: number;
}): number {
  return Math.max(0, Math.round((input.allocationAmount - input.returnedCapitalAmount) * 100) / 100);
}
