"use client";
import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { matchesInstrument, type AssetClass } from "@/domain/trading/models";
import { useMarkets, useWatchlist } from "./queries";
import { EmptyState, MarketCard, MarketList, freshQuote } from "./market-components";
import s from "./trading.module.css";

export const CATEGORY_LABELS: Record<AssetClass, string> = { stocks: "Stocks", crypto: "Crypto", forex: "Forex", commodities: "Commodities", indices: "Indices", etfs: "ETFs", futures: "Futures" };
export const CATEGORY_ORDER: AssetClass[] = ["stocks", "crypto", "forex", "etfs", "indices", "commodities"];
export function Discover({ category, watchlist = false }: { category?: AssetClass; watchlist?: boolean }) {
  const markets = useMarkets();
  const saved = useWatchlist();
  const [query, setQuery] = useState("");
  const data = markets.data;
  const instruments = (data?.instruments ?? []).filter(i => (query.trim() || !category || i.asset_class === category) && (!watchlist || saved.data?.ids.includes(i.id)) && matchesInstrument(i, query));
  const quotes = data?.quotes ?? {};
  const enabledClasses = data?.classes.filter(c => c.enabled).map(c => c.asset_class) ?? [];
  const movers = instruments.filter(i => freshQuote(quotes[i.symbol])?.changePercent != null).sort((a, b) => Number(freshQuote(quotes[b.symbol])?.changePercent) - Number(freshQuote(quotes[a.symbol])?.changePercent));
  const gainers = movers.filter(i => Number(freshQuote(quotes[i.symbol])?.changePercent) > 0).slice(0, 3);
  const losers = movers.filter(i => Number(freshQuote(quotes[i.symbol])?.changePercent) < 0).reverse().slice(0, 3);
  const title = watchlist ? "Watchlist" : category ? `Explore ${CATEGORY_LABELS[category]}` : "Discover";
  return <div className={`${s.surface} ${s.discovery}`}>
    <div className={s.top}><h1 className={s.title}>{title}</h1><span className={s.badge}>{data?.settings.display_mode === "LIVE_PREVIEW" ? "Live preview" : data?.settings.display_mode === "LIVE" ? "Markets" : "Simulation"}</span></div>
    <div className={s.top}><label className={s.search}><Search size={18} aria-hidden /><input aria-label="Search markets" placeholder="Search markets" value={query} maxLength={80} onChange={event => setQuery(event.target.value)} /></label><Link href={watchlist ? "/dashboard/discover" : "/dashboard/watchlist"} className={s.button}>{watchlist ? "Explore markets" : "Your watchlist"}</Link></div>
    {!watchlist && <nav className={s.tabs} aria-label="Market categories"><Link href="/dashboard/discover" aria-current={!category ? "page" : undefined}>Overview</Link>{CATEGORY_ORDER.filter(c => enabledClasses.includes(c)).map(c => <Link key={c} href={`/dashboard/discover/${c}`} aria-current={category === c ? "page" : undefined}>{CATEGORY_LABELS[c]}</Link>)}</nav>}
    {markets.isLoading ? <EmptyState>Loading market data…</EmptyState> : markets.isError ? <EmptyState>Markets could not be loaded. <button className={s.button} onClick={() => markets.refetch()}>Try again</button></EmptyState> : !data?.ready ? <EmptyState>Markets are being prepared. Please check back soon.</EmptyState> : <>
      {watchlist && saved.isError ? <EmptyState>Your watchlist could not be loaded. <button className={s.button} onClick={() => saved.refetch()}>Try again</button></EmptyState> : watchlist && saved.isLoading ? <EmptyState>Loading your watchlist…</EmptyState> : category && !enabledClasses.includes(category) ? <EmptyState>This market category is currently unavailable.</EmptyState> : !instruments.length ? <EmptyState>{query ? "No markets match your search." : watchlist ? "Save a market from its asset page to follow it here." : "No instruments are configured yet."}</EmptyState> : category || query || watchlist ? <>
        {category && !query && <section className={s.section}><h2>Featured markets</h2><div className={s.cards}>{[...instruments].sort((a,b) => Number(b.featured) - Number(a.featured)).slice(0, 3).map(i => <MarketCard key={i.id} instrument={i} result={quotes[i.symbol]} />)}</div></section>}
        <section className={s.section}><h2>{query ? "Search results" : watchlist ? "Saved markets" : "All markets"}</h2><MarketList instruments={instruments} quotes={quotes} /></section>
      </> : <>
        <section className={s.section}><h2>Explore Global Markets</h2><div className={`${s.cards} ${s.featuredCards}`}>{instruments.filter(i => i.featured).slice(0, 4).map(i => <MarketCard key={i.id} instrument={i} result={quotes[i.symbol]} />)}</div></section>
        <section className={s.section}><h2>Daily Movers</h2><div className={s.grid}>{[{ title: "Top Gainers", items: gainers }, { title: "Top Losers", items: losers }].map(group => <div key={group.title}><h3 className={s.muted} style={{ marginBottom: 12 }}>{group.title}</h3>{group.items.length ? <div style={{ display: "grid", gap: 10 }}>{group.items.map(i => <MarketCard key={i.id} instrument={i} result={quotes[i.symbol]} />)}</div> : <EmptyState>Daily movers will appear when fresh market data is available.</EmptyState>}</div>)}</div></section>
        <section className={s.section}><h2>Popular Markets</h2><p className={s.muted} style={{ marginBottom: 14 }}>Selections from the market catalogue.</p><MarketList instruments={CATEGORY_ORDER.flatMap(c => instruments.filter(i => i.asset_class === c).slice(0, 1))} quotes={quotes} /></section>
      </>}
    </>}
  </div>;
}
