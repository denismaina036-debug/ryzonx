"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import type { AssetClassControl, Instrument, TradingSettings } from "@/domain/trading/models";
import type { DataResult, Quote, MarketDataError } from "@/domain/trading/market-data";
export type MarketInstrument = Omit<Instrument, "provider_symbol" | "metadata">;
export interface MarketsData {
  source?: "development" | "supabase";
  ready: boolean; settings: TradingSettings; classes: AssetClassControl[]; instruments: MarketInstrument[];
  quotes: Record<string, DataResult<Quote>>;
  provider: { name: string; connected: boolean; status: MarketDataError };
}
export async function tradingFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(response.status === 401 ? "Please sign in again." : "This request could not be completed. Please try again.");
  return response.json();
}
export function useMarkets(symbol?: string) {
  const { user } = useAuth();
  // A delayed shell profile must not suppress the catalogue request. The API
  // independently checks the authenticated, active user on every request.
  return useQuery({ queryKey: ["trading", "markets", user?.id, symbol], queryFn: () => tradingFetch<MarketsData>(`/api/trading/markets${symbol ? `?symbol=${encodeURIComponent(symbol)}` : ""}`), staleTime: 15_000, refetchInterval: 30_000, refetchIntervalInBackground: false, retry: 1 });
}
export function useWatchlist() {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ["trading", "watchlist", user?.id];
  const query = useQuery({ queryKey: key, queryFn: () => tradingFetch<{ ids: string[] }>("/api/trading/watchlist"), enabled: !!user, refetchOnMount: true });
  const mutation = useMutation({
    mutationFn: (input: { instrumentId: string; saved: boolean }) => tradingFetch("/api/trading/watchlist", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  return { ...query, mutation };
}
