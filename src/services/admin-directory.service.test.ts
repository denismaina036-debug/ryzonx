import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminDirectoryService, groupAdminInvestors, readAllAdminRows } from "./admin-directory.service";
describe("admin directory display reads", () => {
  it("groups actual capital by pool without mixing investors or currencies", () => {
    const profiles = [{ id: "one", full_name: "John Doe", email: "john@example.test" }, { id: "two", full_name: "Jane Doe", email: "jane@example.test" }];
    const allocation = (amount: number, fund: string, currency = "USD", returned = 0) => ({ investor_id: "one", amount, returned_capital_amount: returned, currency, investment_cycles: { fund_id: fund, funds: { name: fund } } });
    const allocations = [allocation(1000,"Black Diamond"), allocation(1000,"Black Diamond"), allocation(1600,"London Precision","USD",100), allocation(200,"London Precision","EUR")];
    const before = structuredClone(allocations);
    const rows = groupAdminInvestors(profiles, allocations);
    expect(rows[0]!.totals).toEqual([{ currency: "USD", capital: 3500 }, { currency: "EUR", capital: 200 }]);
    expect(rows[0]!.pools.map(p => p.capital)).toEqual([2000,1500,200]);
    expect(rows[1]!.pools).toEqual([]);
    expect(allocations).toEqual(before);
  });
  it("reads every page rather than truncating active investors at the API row limit", async () => {
    const all = Array.from({length:1203}, (_,id) => ({id}));
    const load = vi.fn(async (from:number,to:number) => ({data:all.slice(from,to+1),error:null}));
    expect(await readAllAdminRows(load)).toEqual(all);
    expect(load).toHaveBeenCalledTimes(3);
  });
  it("reports read failures instead of silently showing incomplete totals", async () => {
    await expect(readAllAdminRows(async () => ({data:null,error:{message:"failure"}}))).rejects.toThrow("could not be loaded");
  });
  it("requires administrator access before reading either directory", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("Forbidden"));
    await expect(adminDirectoryService.investors()).rejects.toThrow("Forbidden");
    await expect(adminDirectoryService.managers()).rejects.toThrow("Forbidden");
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
