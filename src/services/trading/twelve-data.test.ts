import { describe,it,expect,vi } from "vitest";
import { TwelveDataMarketDataProvider,normalizeTwelveQuote } from "./twelve-data";
import { executableQuote } from "@/domain/trading/market-data";
const now=Date.parse("2026-09-10T10:30:00Z");
const raw={symbol:"XAU/USD",close:"4394.93785",timestamp:1789036140,last_quote_at:now/1000,is_market_open:true,change:"1.20",percent_change:"0.03"};
describe("Twelve Data adapter",()=>{
 it("uses last quote time, canonical symbols and no manufactured spread",()=>{const q=normalizeTwelveQuote("XAUUSD",raw);expect(q.ok).toBe(true);if(q.ok){expect(q.data).toMatchObject({symbol:"XAUUSD",source:"twelve_data",bid:null,ask:null,timestamp:new Date(now).toISOString()});expect(executableQuote(q.data,now).ok).toBe(true);}});
 it("rejects stale, unknown, closed and invalid data",()=>{
  expect(normalizeTwelveQuote("BTCUSD",raw).ok).toBe(false);
  expect(normalizeTwelveQuote("XAUUSD",{...raw,close:"NaN"}).ok).toBe(false);
  const q=normalizeTwelveQuote("XAUUSD",{...raw,last_quote_at:now/1000-61});if(q.ok)expect(executableQuote(q.data,now).ok).toBe(false);
  const closed=normalizeTwelveQuote("XAUUSD",{...raw,is_market_open:false});if(closed.ok)expect(executableQuote(closed.data,now).ok).toBe(false);
 });
 it("batches and enforces credit budget without exposing credentials",async()=>{
  const request=vi.fn(async()=>new Response(JSON.stringify({"XAU/USD":raw,"BTC/USD":{...raw,symbol:"BTC/USD"}})));
  const adapter=new TwelveDataMarketDataProvider("test-secret",request,()=>now,2);
  const result=await adapter.getQuotes(["XAUUSD","BTCUSD"]);expect(result.XAUUSD?.ok).toBe(true);expect(request).toHaveBeenCalledTimes(1);
  expect(await adapter.getQuote("EURUSD")).toEqual({ok:false,error:"rate_limited"});expect(JSON.stringify(result)).not.toContain("test-secret");
 });
 it.each([401,429,500,404])("sanitizes provider error %s",async code=>{const provider=new TwelveDataMarketDataProvider("secret",async()=>new Response(JSON.stringify({code,message:"secret"}),{status:code}),()=>now);const result=await provider.getQuote("XAUUSD");expect(result.ok).toBe(false);expect(JSON.stringify(result)).not.toContain("secret");});
 it("handles network failure and unverified aliases",async()=>{const request=vi.fn(async()=>{throw new Error("secret in upstream URL");});const provider=new TwelveDataMarketDataProvider("secret",request,()=>now);expect((await provider.getQuote("XAUUSD")).ok).toBe(false);expect(await provider.getQuote("USOIL")).toEqual({ok:false,error:"unknown_instrument"});});
});
