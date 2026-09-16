"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import type { DataResult, Quote, HistoricalPoint } from "@/domain/trading/market-data";
import { usableFreeQuote, VERIFIED_MARKET_MESSAGE } from "@/domain/trading/market-availability";
import { ROUTES } from "@/constants/routes";
import type { MarketInstrument } from "./queries";
import s from "./trading.module.css";

export function priceLabel(value: string, precision = 2) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(Number(value));
}
export function quotePriceLabel(instrument: MarketInstrument, price: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: instrument.quote_currency, minimumFractionDigits: instrument.price_precision, maximumFractionDigits: instrument.price_precision }).format(Number(price));
}
export function freshQuote(result?: DataResult<Quote>) { return usableFreeQuote(result); }
export function VerifiedMarketNotice() { return <div><p className={s.muted}>{VERIFIED_MARKET_MESSAGE}</p><Link className={s.button} href={ROUTES.applyPoolManager}>Become a Verified Trader</Link></div>; }
export function Change({ quote }: { quote: Quote | null }) {
  if (!quote || quote.changePercent === null) return <span className={s.muted}>—</span>;
  const positive = Number(quote.changePercent) >= 0;
  return <span className={positive ? s.positive : s.negative}>{positive ? "+" : ""}{priceLabel(quote.changePercent)}%</span>;
}
export function AssetIdentity({ instrument }: { instrument: MarketInstrument }) {
  return <div className={s.asset}><span className={s.avatar} aria-hidden>{instrument.symbol.slice(0, 3)}</span><div style={{ minWidth: 0 }}><div className={s.symbol}>{instrument.symbol}</div><div className={s.muted}>{instrument.name}</div></div></div>;
}
export function EmptyState({ children }: { children: ReactNode }) { return <div className={s.empty} role="status">{children}</div>; }
export function MarketCard({ instrument, result }: { instrument: MarketInstrument; result?: DataResult<Quote> }) {
  const quote = freshQuote(result);
  if (!quote) return <div className={s.card}><Link href={`/dashboard/discover/asset/${instrument.symbol}`}><AssetIdentity instrument={instrument} /></Link><VerifiedMarketNotice /></div>;
  return <Link href={`/dashboard/discover/asset/${instrument.symbol}`} className={s.card}>
    <AssetIdentity instrument={instrument} /><div className={s.price}>{quotePriceLabel(instrument, quote.price)}</div>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 }}><Change quote={quote} /><span className={s.muted}>{quote.marketStatusKnown === false ? "Market status unknown" : quote.marketOpen ? "Market open" : "Market closed"}</span></div>
  </Link>;
}
export function Sparkline({ points }: { points: HistoricalPoint[] }) {
  if (points.length < 2) return <span className={s.muted}>—</span>;
  const prices = points.map(p => Number(p.price));
  const min = Math.min(...prices), max = Math.max(...prices);
  return <svg viewBox="0 0 100 28" width="90" height="28" role="img" aria-label="Seven day price trend"><polyline fill="none" stroke="#356ed1" strokeWidth="1.5" points={prices.map((value, index) => `${index / (prices.length - 1) * 100},${26 - (value - min) / (max - min || 1) * 24}`).join(" ")} /></svg>;
}
export function MarketList({ instruments, quotes, history = {} }: { instruments: MarketInstrument[]; quotes: Record<string, DataResult<Quote>>; history?: Record<string, HistoricalPoint[]> }) {
  if (!instruments.length) return <EmptyState>No markets match your search.</EmptyState>;
  return <div className={s.card}>
    <div className={`${s.row} ${s.rowhead}`} aria-hidden><span>Asset</span><span>Price</span><span className={s.changeCell}>Today</span><span className={s.historyCell}>7D</span><span className={s.statusCell}>Market</span><span>Explore</span></div>
    {instruments.map(instrument => { const quote = freshQuote(quotes[instrument.symbol]); return <div className={s.row} key={instrument.id}>
      <Link href={`/dashboard/discover/asset/${instrument.symbol}`}><AssetIdentity instrument={instrument} /></Link>
      {!quote ? <div style={{ gridColumn: "2 / -1" }}><VerifiedMarketNotice /></div> : <>
      <div style={{ fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>{quotePriceLabel(instrument, quote.price)}<span className={s.mobileChange}><Change quote={quote} /></span></div>
      <span className={s.changeCell}><Change quote={quote} /></span>
      <span className={s.historyCell}><Sparkline points={history[instrument.symbol] ?? []} /></span>
      <span className={`${s.statusCell} ${s.muted}`}>{quote.marketStatusKnown === false ? "Unknown" : quote.marketOpen ? "Open" : "Closed"}</span>
      <Link className={s.button} href={`/dashboard/discover/asset/${instrument.symbol}`}>View</Link>
      </>}
    </div>; })}
  </div>;
}
