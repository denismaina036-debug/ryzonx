import "server-only";
import { randomUUID } from "node:crypto";
import { eligibility } from "@/domain/trading/models";
import { virtualExecutionPrice, executionPrice, markPosition, protectionReason, simulationTotals, type VirtualOpen, type SimulationPosition } from "@/domain/trading/simulation";
import { MARKET_DATA_MESSAGES, type Quote } from "@/domain/trading/market-data";
import { readCatalogue } from "./repository";
import { marketData, freeMarketData } from "./provider";
import { simulationRepository as repository } from "./simulation-repository";
import { ExecutionRouter, SimulationExecutionProvider } from "@/domain/trading/execution";
const execution=new ExecutionRouter(new SimulationExecutionProvider(repository));
export async function simulationSnapshot(userId:string) {
  const {account,positions}=await repository.snapshot(userId);
  const catalogue=await readCatalogue();
  const instruments=new Map(catalogue.instruments.map(i=>[i.id,i]));
  // DB catalogue IDs are authoritative; dev metadata never authorizes settlement.
  const symbols=positions.filter(p=>p.status==="OPEN").map(p=>instruments.get(p.instrument_id)?.symbol).filter((s):s is string=>!!s);
  const quotes=await marketData.getQuotes(symbols);
  const valued=positions.map(p=>{
    const symbol=instruments.get(p.instrument_id)?.symbol;
    const result=symbol ? quotes[symbol] : undefined;
    let mark:ReturnType<typeof markPosition>|null=null;
    if(result?.ok && p.status==="OPEN") { try { mark=markPosition(p,executionPrice(result.data,p.side==="BUY"?"SELL":"BUY")); } catch {} }
    return {...p,symbol:symbol??"Unavailable",mark};
  });
  return {account,positions:valued,summary:account ? simulationTotals(account.cash,valued.filter(p=>p.status==="OPEN")) : null, databaseReady:true};
}
async function fresh(symbol:string) {
  const result=await marketData.getQuote(symbol);
  if(!result.ok) throw new Error(MARKET_DATA_MESSAGES[result.error]);
  return result.data;
}
export async function openSimulation(userId:string,input:VirtualOpen,key:string) {
  const catalogue=await readCatalogue();
  if(catalogue.source!=="supabase" || !catalogue.ready) throw new Error("Simulation execution requires the migrated database catalogue.");
  const instrument=catalogue.instruments.find(i=>i.symbol===input.symbol);
  if(!instrument) throw new Error("Instrument unavailable.");
  const reason=eligibility(catalogue.settings,catalogue.classes,instrument,input.side);
  if(reason) throw new Error(reason);
  const result=await freeMarketData.getQuote(instrument.symbol);
  if (!result.ok) throw new Error("A fresh eligible free quote is required.");
  const quote=result.data;
  if (quote.symbol !== instrument.symbol) throw new Error("Quote symbol mismatch.");
  virtualExecutionPrice(quote,input.side);
  return execution.open({userId,request:{instrument:instrument.id,side:input.side,amount:input.amount,stopLoss:null,takeProfit:null,idempotencyKey:key},quote});
}
export async function closeSimulation(userId:string,positionId:string,key:string,reason:"MANUAL"|"STOP_LOSS"|"TAKE_PROFIT"="MANUAL",knownQuote?:Quote) {
  const p=(await repository.positions(userId)).find(p=>p.id===positionId);
  if(!p) throw new Error("Position not found.");
  if(p.status==="CLOSED") return p.id;
  const catalogue=await readCatalogue();
  if(catalogue.source!=="supabase") throw new Error("Simulation execution requires the migrated database catalogue.");
  const instrument=catalogue.instruments.find(i=>i.id===p.instrument_id);
  if(!instrument) throw new Error("Instrument unavailable.");
  const quote=knownQuote??await fresh(instrument.symbol);
  executionPrice(quote,p.side==="BUY"?"SELL":"BUY");
  return execution.close({userId,positionId:p.id,key,reason,quote});
}
export async function reconcileProtection(userId?:string) {
  const catalogue=await readCatalogue();
  if(catalogue.source!=="supabase" || !catalogue.ready) return {closed:0};
  const positions:SimulationPosition[]=userId ? (await repository.positions(userId)).filter(p=>p.status==="OPEN") : await repository.openPositions();
  let closed=0;
  for(const p of positions) {
    if(!p.stop_loss && !p.take_profit) continue;
    const instrument=catalogue.instruments.find(i=>i.id===p.instrument_id);
    if(!instrument) continue;
    try {
      const q=await fresh(instrument.symbol), price=executionPrice(q,p.side==="BUY"?"SELL":"BUY");
      const reason=protectionReason(p,price,Boolean(catalogue.settings.stop_loss_enabled),Boolean(catalogue.settings.take_profit_enabled));
      if(reason) { await closeSimulation(p.user_id,p.id,randomUUID(),reason,q); closed++; }
    } catch { /* No quote means no settlement; durable position remains unchanged. */ }
  }
  return {closed};
}
