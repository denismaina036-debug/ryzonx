import { describe, expect, it } from "vitest";
import {
  isCopyRestartAfterStop,
  resolveMarketplaceCopyRestart,
} from "./copy-restart";

describe("copying restart lifecycle", () => {
  it("replaces a fully stopped allocation instead of adding to its returned amount", () => {
    expect(
      resolveMarketplaceCopyRestart({
        status: "rejected",
        existingAmount: 150,
        incomingAmount: 100,
        existingFundingConfirmedAt: "2026-09-17T09:13:07.219Z",
        now: "2026-09-17T09:17:45.942Z",
      })
    ).toEqual({
      restartingStoppedCopy: true,
      nextAmount: 100,
      fundingConfirmedAt: "2026-09-17T09:17:45.942Z",
    });
  });

  it("adds capital to an allocation that is still active", () => {
    expect(
      resolveMarketplaceCopyRestart({
        status: "funding_confirmed",
        existingAmount: 150,
        incomingAmount: 100,
        existingFundingConfirmedAt: "2026-09-17T09:13:07.219Z",
        now: "2026-09-17T09:17:45.942Z",
      })
    ).toEqual({
      restartingStoppedCopy: false,
      nextAmount: 250,
      fundingConfirmedAt: "2026-09-17T09:13:07.219Z",
    });
  });

  it("treats a funded restart after a completed stop as active copying", () => {
    expect(
      isCopyRestartAfterStop({
        returnableAmount: 100,
        fundingConfirmedAt: "2026-09-17T09:17:45.942Z",
        createdAt: "2026-09-17T09:13:07.400Z",
        stoppedAt: "2026-09-17T09:16:16.330Z",
      })
    ).toBe(true);
  });
});
