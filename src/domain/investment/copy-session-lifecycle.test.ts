import { describe, expect, it } from "vitest";
import {
  resolveCopyStopMode,
  resolveCurrentCopySessionId,
  resolveReturnableCopyCapital,
} from "./copy-session-lifecycle";

describe("copy session lifecycle", () => {
  it("settles unused funding capital immediately", () => {
    expect(resolveCopyStopMode({ cycleStatuses: ["funding"], queuedCapital: 0, hasCompletedBalance: false }))
      .toBe("immediate_funding");
  });

  it("selects a new copy session after the old session is closed", () => {
    expect(resolveCurrentCopySessionId({
      allocations: [{ copySessionId: "session-2", startedAt: "2026-09-17T10:00:00Z" }],
      queues: [],
    })).toBe("session-2");
  });

  it("waits only when this session participates in trading", () => {
    expect(resolveCopyStopMode({ cycleStatuses: ["trading"], queuedCapital: 0, hasCompletedBalance: false }))
      .toBe("pending_cycle");
  });

  it("returns the loss-adjusted allocation amount", () => {
    expect(resolveReturnableCopyCapital({ allocationAmount: 92, returnedCapitalAmount: 0 })).toBe(92);
  });

  it("ignores historical cycles when the current balance is not trading", () => {
    expect(resolveCopyStopMode({ cycleStatuses: [], queuedCapital: 0, hasCompletedBalance: true }))
      .toBe("immediate_completed");
  });

  it("settles reserved queued capital immediately", () => {
    expect(resolveCopyStopMode({ cycleStatuses: [], queuedCapital: 100, hasCompletedBalance: false }))
      .toBe("immediate_queue");
  });

  it("does not return already-refunded capital again", () => {
    expect(resolveReturnableCopyCapital({ allocationAmount: 100, returnedCapitalAmount: 100 })).toBe(0);
  });

  it("prefers the latest independent session over older history", () => {
    expect(resolveCurrentCopySessionId({
      allocations: [
        { copySessionId: "session-1", startedAt: "2026-09-17T08:00:00Z" },
        { copySessionId: "session-2", startedAt: "2026-09-17T10:00:00Z" },
      ],
      queues: [],
    })).toBe("session-2");
  });

  it("recognizes a new session started before a cycle exists", () => {
    expect(resolveCurrentCopySessionId({
      allocations: [],
      queues: [],
      starts: [{ copySessionId: "session-no-cycle", startedAt: "2026-09-17T11:00:00Z" }],
    })).toBe("session-no-cycle");
  });
});
