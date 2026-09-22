import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  mergeAuthoritativeCopierTradeResults,
  selectAuthoritativeCopierTradeRows,
} from "@/lib/investor/copier-trade-history";

const historicalTrades = [
  { id: "t1", investment_cycle_id: "c1", closed_at: "2026-09-20T10:00:00Z", opened_at: null, created_at: "2026-09-20T09:00:00Z" },
  { id: "t2", investment_cycle_id: "c1", closed_at: "2026-09-21T10:00:00Z", opened_at: null, created_at: "2026-09-21T09:00:00Z" },
  { id: "t3", investment_cycle_id: "c2", closed_at: "2026-09-22T10:00:00Z", opened_at: null, created_at: "2026-09-22T09:00:00Z" },
];

const transactionHistorySource = readFileSync(
  resolve(process.cwd(), "src/features/investor/components/investor-transactions-view.tsx"),
  "utf8"
);

describe("copier trade history read model", () => {
  it("uses authoritative personal profit and loss instead of the master trade result", () => {
    const results = mergeAuthoritativeCopierTradeResults(
      [
        { trade_entry_id: "profit", profit_amount: 30, created_at: "2026-09-22T10:00:00Z" },
        { trade_entry_id: "profit", profit_amount: 7.3, created_at: "2026-09-22T10:00:00Z" },
      ],
      [{ trade_entry_id: "loss", loss_amount: 37.3, created_at: "2026-09-22T11:00:00Z" }]
    );

    expect(results.get("profit")).toBe(37.3);
    expect(results.get("loss")).toBe(-37.3);
  });

  it("keeps historical trades after stop and excludes later unallocated trades", () => {
    const futureTrade = {
      id: "t4",
      investment_cycle_id: "c3",
      closed_at: "2026-09-23T10:00:00Z",
      opened_at: null,
      created_at: "2026-09-23T09:00:00Z",
    };
    const results = new Map([
      ["t1", 37.3],
      ["t2", -12.1],
      ["t3", 24.7],
    ]);

    const visible = selectAuthoritativeCopierTradeRows(
      [...historicalTrades, futureTrade],
      results,
      100
    );

    expect(visible.map((trade) => trade.id)).toEqual(["t3", "t2", "t1"]);
    expect(visible).not.toContainEqual(expect.objectContaining({ id: "t4" }));
  });

  it("shows continuous history across internal cycles without duplicate activity", () => {
    const results = new Map([
      ["t1", 37.3],
      ["t2", -12.1],
      ["t3", 24.7],
    ]);

    const visible = selectAuthoritativeCopierTradeRows(
      [...historicalTrades, historicalTrades[2]!],
      results,
      100
    );

    expect(visible.map((trade) => trade.id)).toEqual(["t3", "t2", "t1"]);
  });

  it("keeps internal lifecycle identifiers out of copier transaction history", () => {
    expect(transactionHistorySource).not.toMatch(/cycle (number|id)/i);
    expect(transactionHistorySource).not.toMatch(/allocation id/i);
    expect(transactionHistorySource).not.toMatch(/copy session/i);
    expect(transactionHistorySource).not.toMatch(/settlement id/i);
  });
});
