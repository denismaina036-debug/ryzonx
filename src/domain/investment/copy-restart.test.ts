import { describe, expect, it } from "vitest";
import { isCopyRestartAfterStop } from "./copy-restart";

describe("copying restart lifecycle", () => {
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
