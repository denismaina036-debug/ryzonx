import { describe, expect, it } from "vitest";
import { searchExisting, searchMarkets, type SearchResult } from "./unified-search";
import seed from "../../../config/trading/development-catalogue.json";
import { instrumentSchema } from "@/domain/trading/models";
describe("unified search sources", () => {
  it("routes canonical market searches to asset pages", () => {
    const instruments = seed.map(i => instrumentSchema.parse(i));
    expect(searchMarkets(instruments, "Gold")[0]?.href).toBe("/dashboard/discover/asset/XAUUSD");
    expect(searchMarkets(instruments, "btc")[0]?.label).toBe("BTCUSD");
  });
  it("preserves existing pool and manager destinations", () => {
    const index: SearchResult[] = [{ id: "pool", kind: "pools", label: "Alpha pool", detail: "Alex", href: "/marketplace/alpha" }, { id: "manager", kind: "managers", label: "Alex", detail: "Pool manager", href: "/managers/alex" }];
    expect(searchExisting(index, "alex")).toEqual(index);
    expect(searchExisting(index, "alpha")).toEqual([index[0]]);
  });
});
