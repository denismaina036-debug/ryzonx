"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { classSchema, instrumentControlsSchema, settingsSchema, type AssetClassControl, type Instrument, type TradingSettings } from "@/domain/trading/models";
import { tradingFetch } from "./queries";
import { CATEGORY_LABELS } from "./discover";
import { EmptyState } from "./market-components";
import s from "./trading.module.css";

interface AdminData { ready: boolean; source: "development" | "supabase"; problem?: string; settings: TradingSettings; classes: AssetClassControl[]; instruments: Instrument[]; provider: { name: string; connected: boolean; status: string; state?: string; lastSuccessfulQuoteTime?: string | null } }
type Save = (payload: unknown) => Promise<void>;
export function AdminTradingControls() {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ["trading", "admin", user?.id];
  const query = useQuery({ queryKey: key, queryFn: () => tradingFetch<AdminData>("/api/admin/trading"), refetchOnMount: true });
  const [message, setMessage] = useState("");
  const mutation = useMutation({ mutationFn: (value: unknown) => tradingFetch("/api/admin/trading", { method: "PATCH", body: JSON.stringify(value) }), onSuccess: () => client.invalidateQueries({ queryKey: key }) });
  const save: Save = async payload => {
    setMessage("");
    try { await mutation.mutateAsync(payload); setMessage("Trading controls saved."); }
    catch { setMessage("Could not save. Check the configuration and try again."); }
  };
  const data = query.data;
  return <div className={s.surface}><div className={s.top}><h1 className={s.title}>Trading Control Center</h1><span className={s.badge}>Simulation</span></div>
    {query.isLoading ? <EmptyState>Loading trading configuration…</EmptyState> : query.isError ? <EmptyState>Configuration could not be loaded. <button className={s.button} onClick={() => query.refetch()}>Retry</button></EmptyState> : !data?.ready ? <EmptyState>Trading configuration is unavailable. Install migration 00084 or check database connectivity.</EmptyState> : <>
      <div className={s.notice}>Execution is locked to SIMULATED. Display mode changes presentation only. Simulation settlement requires the migrated database. Real balances are never used.</div>
      {data.source === "development" && <div className={s.notice}>Local development catalogue. Controls and watchlists are stored on this computer; the hosted database is unchanged.</div>}
      <div className={s.grid}><SettingsForm key={JSON.stringify(data.settings)} settings={data.settings} save={save} busy={mutation.isPending} /><section className={s.card}><h2 className={s.symbol}>Market data provider</h2><p style={{ marginTop: 16 }}>{data.provider.name}</p><p className={s.muted}>{data.provider.state ?? "Not Configured"}</p><p className={s.muted}>Last successful quote: {data.provider.lastSuccessfulQuoteTime ? new Date(data.provider.lastSuccessfulQuoteTime).toLocaleString() : "None"}</p></section></div>
      <p role="status" className={s.muted} style={{ marginTop: 16 }}>{message}</p>
      <section className={s.section}><h2>Asset classes</h2><div className={s.checks}>{data.classes.map(c => <label key={c.asset_class}><input type="checkbox" checked={c.enabled} disabled={c.asset_class === "futures" || mutation.isPending} onChange={e => { const value = classSchema.parse({ ...c, enabled: e.target.checked }); void save({ kind: "class", value }); }} />{CATEGORY_LABELS[c.asset_class]}{c.asset_class === "futures" && " · Prepared, disabled"}</label>)}</div></section>
      <section className={s.section}><h2>Instrument controls</h2><div className={s.grid}>{data.instruments.map(i => <InstrumentForm key={`${i.id}:${i.updated_at}`} instrument={i} save={save} busy={mutation.isPending} />)}</div></section>
    </>}
  </div>;
}
function SettingsForm({ settings, save, busy }: { settings: TradingSettings; save: Save; busy: boolean }) {
  const [value, setValue] = useState(settingsSchema.parse(settings));
  return <form className={s.card} onSubmit={e => { e.preventDefault(); void save({ kind: "settings", value: settingsSchema.parse(value) }); }}><h2 className={s.symbol}>Platform trading</h2><div className={s.checks}><label><input type="checkbox" checked={value.trading_enabled} onChange={e => setValue({ ...value, trading_enabled: e.target.checked })} />Trading enabled</label></div>{(["simulation_enabled","buy_enabled","sell_enabled","stop_loss_enabled","take_profit_enabled"] as const).map(field => <label className={s.field} key={field}><span><input type="checkbox" checked={value[field]} onChange={e=>setValue({...value,[field]:e.target.checked})}/>{field.replaceAll("_"," ")}</span></label>)}<label className={s.field}>Starting simulation cash · USD<input inputMode="decimal" value={value.default_simulation_balance} onChange={e=>setValue({...value,default_simulation_balance:e.target.value})}/></label><p className={s.muted}>Starting credit applies to new accounts only. Existing balances are never reset. SL/TP requires the scheduled protection worker.</p><label className={s.field}>Display mode<select value={value.display_mode} onChange={e => setValue({ ...value, display_mode: settingsSchema.shape.display_mode.parse(e.target.value) })}><option value="SIMULATION">Simulation</option><option value="LIVE_PREVIEW">Live preview</option><option value="LIVE">Live presentation</option></select></label><p className={s.muted}>Actual execution environment: SIMULATED</p><button disabled={busy} className={`${s.button} ${s.primary}`} style={{ marginTop: 16 }}>Save platform settings</button></form>;
}
function InstrumentForm({ instrument, save, busy }: { instrument: Instrument; save: Save; busy: boolean }) {
  const [value, setValue] = useState({ enabled: instrument.enabled !== false, trading_enabled: instrument.trading_enabled, buy_enabled: instrument.buy_enabled, sell_enabled: instrument.sell_enabled, featured: instrument.featured, minimum_trade_amount: instrument.minimum_trade_amount, maximum_trade_amount: instrument.maximum_trade_amount, display_order: instrument.display_order });
  const [error, setError] = useState("");
  return <form className={s.card} onSubmit={e => { e.preventDefault(); const result = instrumentControlsSchema.safeParse(value); if (!result.success) { setError("Use positive amounts, maximum ≥ minimum, and a whole display order from 0 to 100000."); return; } setError(""); void save({ kind: "instrument", id: instrument.id, value: result.data }); }}>
    <h3 className={s.symbol}>{instrument.symbol} <span className={s.muted}>· {instrument.name}</span></h3><p className={s.muted}>{CATEGORY_LABELS[instrument.asset_class]}</p>
    <div className={s.checks}>{(["enabled", "trading_enabled", "buy_enabled", "sell_enabled", "featured"] as const).map((field, index) => <label key={field}><input type="checkbox" checked={value[field]} onChange={e => setValue({ ...value, [field]: e.target.checked })} />{["Listed", "Trading", "BUY", "SELL", "Featured"][index]}</label>)}</div>
    <div className={s.grid}><label className={s.field}>Minimum · USD<input inputMode="decimal" value={value.minimum_trade_amount} onChange={e => setValue({ ...value, minimum_trade_amount: e.target.value })} /></label><label className={s.field}>Maximum · USD (optional)<input inputMode="decimal" value={value.maximum_trade_amount ?? ""} onChange={e => setValue({ ...value, maximum_trade_amount: e.target.value || null })} /></label></div>
    <label className={s.field}>Display order<input type="number" min={0} max={100000} step={1} value={value.display_order} onChange={e => setValue({ ...value, display_order: Number(e.target.value) })} /></label>
    {error && <p role="alert" className={s.negative}>{error}</p>}<button disabled={busy} className={s.button}>Save {instrument.symbol}</button>
  </form>;
}
