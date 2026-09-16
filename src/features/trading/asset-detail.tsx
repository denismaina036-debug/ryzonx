"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Star, ArrowLeft } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { canonicalSymbol, type Side } from "@/domain/trading/models";
import { TIMEFRAMES, type Timeframe, type DataResult, type HistoricalPoint } from "@/domain/trading/market-data";
import { tradingFetch, useMarkets, useWatchlist } from "./queries";
import { AssetIdentity, Change, EmptyState, VerifiedMarketNotice, freshQuote, priceLabel, quotePriceLabel } from "./market-components";
import { TradeTicket } from "./trade-ticket";
import s from "./trading.module.css";

export function AssetDetail({ symbol }: { symbol: string }) {
  const markets = useMarkets(canonicalSymbol(symbol)), saved = useWatchlist();
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [tab, setTab] = useState("Overview");
  const [side, setSide] = useState<Side | null>(null);
  const instrument = markets.data?.instruments.find(i => i.symbol === canonicalSymbol(symbol));
  const quote = instrument ? freshQuote(markets.data?.quotes[instrument.symbol]) : null;
  const history = useQuery({ queryKey: ["trading", "history", symbol, timeframe], queryFn: () => tradingFetch<DataResult<HistoricalPoint[]>>(`/api/trading/history?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`), enabled: !!instrument && !!quote, staleTime: 60_000 });
  const points = history.data?.ok ? history.data.data : [];
  if (markets.isLoading) return <div className={s.surface}><EmptyState>Loading market…</EmptyState></div>;
  if (!instrument || !markets.data) return <div className={s.surface}><Link href="/dashboard/discover" className={s.button}>Back to Discover</Link><EmptyState>{markets.isError ? "Market could not be loaded." : "This market is currently unavailable."}</EmptyState></div>;
  const isSaved = saved.data?.ids.includes(instrument.id) ?? false;
  return <div className={s.surface}>
    <div className={s.top}><Link href="/dashboard/discover" className={s.muted} style={{ display: "flex", gap: 8, alignItems: "center" }}><ArrowLeft size={16} /> Discover</Link><span className={s.badge}>{markets.data.settings.display_mode === "SIMULATION" ? "Simulation" : markets.data.settings.display_mode === "LIVE_PREVIEW" ? "Live preview" : "Markets"}</span></div>
    <div className={s.top}><div><h1 className={s.title} style={{ marginBottom: 16 }}>{instrument.name}</h1><AssetIdentity instrument={instrument} /></div><button aria-label={isSaved ? "Remove from watchlist" : "Add to watchlist"} aria-pressed={isSaved} className={s.button} disabled={saved.isLoading || saved.isError || saved.mutation.isPending} onClick={() => saved.mutation.mutate({ instrumentId: instrument.id, saved: !isSaved })}><Star size={17} fill={isSaved ? "currentColor" : "none"} />{isSaved ? "Watching" : "Watch"}</button></div>
    {(saved.isError || saved.mutation.isError) && <p className={s.notice} role="alert">Watchlist unavailable. Please try again shortly.</p>}
    {!quote ? <VerifiedMarketNotice /> : <>
    <div className={s.top}><div><div className={s.price} style={{ fontSize: "clamp(32px,5vw,46px)" }}>{quotePriceLabel(instrument, quote.price)}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10 }}><Change quote={quote} /><span className={s.muted}>{quote.marketStatusKnown === false ? "Market status unknown" : quote.marketOpen ? "Market open" : "Market closed"}</span></div>{quote && <p className={s.muted}>As of {new Date(quote.timestamp).toLocaleString()}</p>}</div><div style={{ display: "flex", gap: 10 }}><button className={s.button} disabled={!instrument.sell_enabled || !instrument.trading_enabled} onClick={() => setSide("SELL")}>SELL</button><button className={`${s.button} ${s.primary}`} disabled={!instrument.buy_enabled || !instrument.trading_enabled} onClick={() => setSide("BUY")}>BUY</button></div></div>
    <div className={s.tabs} aria-label="Chart timeframe">{TIMEFRAMES.map(t => <button key={t} aria-pressed={timeframe === t} onClick={() => setTimeframe(t)}>{t}</button>)}</div>
    <div className={s.chart}>{history.isLoading ? <EmptyState>Loading chart…</EmptyState> : points.length < 2 ? <EmptyState>Price history is currently unavailable.</EmptyState> : <ResponsiveContainer width="100%" height="100%"><LineChart data={points.map(p => ({ ...p, value: Number(p.price) }))}><XAxis dataKey="timestamp" tickFormatter={value => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })} minTickGap={70} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={["auto", "auto"]} width={65} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={label => new Date(String(label)).toLocaleString()} /><Line type="linear" dataKey="value" name={`Price · ${instrument.quote_currency}`} stroke="#2463eb" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>}</div>
    </>}
    <div className={s.tabs} aria-label="Asset information">{["Overview", "Stats", "Your Position"].map(t => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === "Overview" ? <dl className={s.stats}><div><dt>Asset class</dt><dd style={{ textTransform: "capitalize" }}>{instrument.asset_class}</dd></div><div><dt>Exchange</dt><dd>{instrument.exchange ?? "—"}</dd></div><div><dt>Quote currency</dt><dd>{instrument.quote_currency}</dd></div><div><dt>Minimum amount</dt><dd>${priceLabel(instrument.minimum_trade_amount)}</dd></div></dl> : tab === "Stats" ? !quote ? <VerifiedMarketNotice /> : <dl className={s.stats}><div><dt>Bid</dt><dd>{quote?.bid ? priceLabel(quote.bid, instrument.price_precision) : "—"}</dd></div><div><dt>Ask</dt><dd>{quote?.ask ? priceLabel(quote.ask, instrument.price_precision) : "—"}</dd></div><div><dt>Daily change</dt><dd>{quote?.change ? priceLabel(quote.change, instrument.price_precision) : "—"}</dd></div><div><dt>Daily change %</dt><dd><Change quote={quote} /></dd></div></dl> : <EmptyState><Link className={s.button} href="/dashboard/trading/portfolio">View your simulation positions in Portfolio</Link></EmptyState>}
    <TradeTicket key={`${instrument.id}:${side}`} side={side} instrument={instrument} quote={quote} data={markets.data} onClose={() => setSide(null)} />
  </div>;
}
