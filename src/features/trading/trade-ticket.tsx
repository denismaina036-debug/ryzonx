"use client";
import { useRef,useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Dialog,DialogContent,DialogTitle,DialogDescription } from "@/components/ui/dialog";
import { decimal } from "@/domain/trading/calculations";
import { eligibility,type Side } from "@/domain/trading/models";
import { estimatedUnits,virtualExecutionPrice as executionPrice } from "@/domain/trading/simulation";
import { usableFreeQuote } from "@/domain/trading/market-availability";
import type { Quote } from "@/domain/trading/market-data";
import type { MarketInstrument,MarketsData } from "./queries";
import { quotePriceLabel,priceLabel,VerifiedMarketNotice } from "./market-components";
import { useVirtualAccount,useVirtualOpen } from "./simulation-queries";
import s from "./trading.module.css";
export function TradeTicket({side,instrument,quote,data,onClose}:{side:Side|null;instrument:MarketInstrument;quote:Quote|null;data:MarketsData;onClose:()=>void}) {
 const [amount,setAmount]=useState("");
 const account=useVirtualAccount(), action=useVirtualOpen(), router=useRouter();
 const attempt=useRef<{signature:string;key:string}|null>(null); const submitting=useRef(false);
 let price:string|null=null, units="—", error:string|null=null;
 if(quote && side) { try { price=executionPrice(quote,side); } catch {} }
 const reason=side ? eligibility(data.settings,data.classes,instrument,side) : null;
 try {
  if(amount) {
   const value=decimal(amount);
   if(!/^\d+(\.\d{1,2})?$/.test(amount) || value<=BigInt(0) || value<decimal(instrument.minimum_trade_amount) || (instrument.maximum_trade_amount && value>decimal(instrument.maximum_trade_amount))) error="Enter an amount within this market’s limits.";
   else if(account.data?.account && value>decimal(account.data.account.cash_usd)) error="Insufficient virtual cash.";
   else if(price) units=estimatedUnits(amount,price,instrument.quantity_precision);
  }
 } catch { error="Enter a valid USD amount."; }
 const blocked=reason??(data.source!=="supabase" ? "Simulation requires the migrated database catalogue." : !account.data?.account ? "Virtual account unavailable." : !price ? "A fresh, open-market quote is required." : error);
 async function submit() {
  if(!usableFreeQuote(quote ? {ok:true,data:quote} : undefined) || submitting.current || blocked || !amount || !side) return;
  const payload={symbol:instrument.symbol,side,amount};
  const signature=JSON.stringify(payload);
  if(attempt.current?.signature!==signature) attempt.current={signature,key:crypto.randomUUID()};
  submitting.current=true;
  try { await action.mutateAsync({body:payload,key:attempt.current.key}); toast.success("Virtual position opened."); onClose(); router.push("/dashboard/trading/portfolio"); }
  catch {} finally { submitting.current=false; }
 }
 if (!usableFreeQuote(quote ? {ok:true,data:quote} : undefined)) return <Dialog open={side!==null} onOpenChange={open=>!open && onClose()}><DialogContent className={s.ticket}><DialogTitle>{instrument.name}</DialogTitle><DialogDescription>Market access</DialogDescription><VerifiedMarketNotice /></DialogContent></Dialog>;
 return <Dialog open={side!==null} onOpenChange={open=>!open && !action.isPending && onClose()}><DialogContent className={s.ticket}>
  <DialogTitle>{side} {instrument.symbol}</DialogTitle><DialogDescription>Simulation · {instrument.name} · USD · 1×</DialogDescription>
  <p className={s.notice}>Simulation funds are not withdrawable. Maximum loss is limited to the invested amount, including short positions.</p>
  <label className={s.field}>Amount · USD<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={instrument.minimum_trade_amount} maxLength={30}/></label>
  <dl><div><dt>Available virtual cash</dt><dd>{account.data?.account ? `$${priceLabel(account.data.account.cash_usd)}` : "Unavailable"}</dd></div><div><dt>Executable price</dt><dd>{price ? quotePriceLabel(instrument,price) : "Unavailable"}</dd></div><div><dt>Estimated units</dt><dd>{units}</dd></div><div><dt>Opening allocation · USD</dt><dd>{amount && !error ? amount : "—"}</dd></div></dl>
  {price && <p className={s.muted}>{quote?.bid===null && quote?.ask===null ? "Provider last price; bid/ask unavailable. No artificial spread." : "Provider bid/ask used when available."} Final price is checked on the server.</p>}
  {blocked && <p className={s.notice}>{blocked}</p>}{action.error && <p role="alert" className={s.negative}>{action.error.message}</p>}
  {!account.data?.account && <Link className={s.button} href="/dashboard/trading/portfolio">Simulation account</Link>}
  <button onClick={()=>void submit()} disabled={Boolean(blocked)||!amount||units==="—"||units==="0"||action.isPending} className={`${s.button} ${s.primary}`}>{action.isPending ? "Opening…" : "Open simulation trade"}</button>
 </DialogContent></Dialog>;
}
