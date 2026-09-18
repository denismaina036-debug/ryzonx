import { describe, expect, it } from "vitest";
import type { InvestmentCycle } from "@/domain/investment/types";
import { splitCyclesForSections } from "./pm-cycle-list-sections";

describe("pool manager cycle sections", () => {
  const cycle = (id: string, status: InvestmentCycle["status"]): InvestmentCycle =>
    ({ id, status } as InvestmentCycle);

  it("does not label approved or draft cycles as currently funding", () => {
    const sections = splitCyclesForSections([
      cycle("approved", "approved"),
      cycle("draft", "draft"),
      cycle("funding", "funding"),
    ]);

    expect(sections.fundingCycles.map((item) => item.id)).toEqual(["funding"]);
    expect(sections.preparedCycles.map((item) => item.id)).toEqual(["approved", "draft"]);
  });
});
