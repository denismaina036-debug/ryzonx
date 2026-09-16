import { matchesInstrument, type Instrument } from "@/domain/trading/models";
export type SearchKind = "markets" | "pools" | "managers";
export interface SearchResult { id: string; kind: SearchKind; label: string; detail: string; href: string }
export function searchMarkets(instruments: Instrument[], query: string): SearchResult[] {
  return instruments.filter(i => matchesInstrument(i, query)).slice(0, 8).map(i => ({ id: i.id, kind: "markets", label: i.symbol, detail: i.name, href: `/dashboard/discover/asset/${i.symbol}` }));
}
export function searchExisting(index: SearchResult[], query: string): SearchResult[] {
  const normalized = query.trim().toLowerCase();
  return index.filter(item => `${item.label} ${item.detail}`.toLowerCase().includes(normalized)).slice(0, 12);
}
