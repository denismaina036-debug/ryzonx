import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks=vi.hoisted(()=>({identity:vi.fn(),catalogue:vi.fn(),quote:vi.fn(),rpc:vi.fn()}));
vi.mock("@/lib/auth/session",()=>({getCurrentUser:mocks.identity}));
vi.mock("./repository",()=>({readCatalogue:mocks.catalogue}));
vi.mock("./provider",()=>({freeMarketData:{getQuote:mocks.quote},marketData:{getQuote:()=>{throw new Error("Paid provider must not be called");}}}));
vi.mock("./simulation-repository",()=>({simulationRepository:{rpc:mocks.rpc}}));
import { POST } from "@/app/api/trading/simulation/open/route";
import { virtualExecutionPrice as executionPrice } from "@/domain/trading/simulation";
import type { Quote } from "@/domain/trading/market-data";
let db:PGlite, user:string, instrument:string;
const quote=(extra:Partial<Quote>={}):Quote=>({symbol:"XAUUSD",price:"100",bid:"99",ask:"101",source:"biquote",timestamp:new Date().toISOString(),marketOpen:true,change:null,changePercent:null,...extra});
const request=(body:unknown,key=randomUUID(),origin="http://localhost:3000")=>new Request("http://localhost:3000/api/trading/simulation/open",{method:"POST",headers:{origin,"Content-Type":"application/json","Idempotency-Key":key},body:JSON.stringify(body)});
const body=(side="BUY",amount="1000")=>({symbol:"XAUUSD",side,amount});
const cash=async()=>Number((await db.query<{cash:string}>("select cash_usd::text as cash from virtual_trading_accounts where user_id=$1",[user])).rows[0]?.cash);
beforeAll(async()=>{
 db=new PGlite();
 await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; create table profiles(id uuid primary key,role text,is_active boolean default true);");
 // Disposable in-memory PostgreSQL only. No configured Supabase client or network.
 for(const name of ["00084_trading_stage_one.sql","00085_simulation_trading.sql","00086_virtual_trading_accounts.sql","00087_virtual_position_opening.sql"])await db.exec(readFileSync(`supabase/migrations/${name}`,"utf8"));
 await db.exec("update trading_settings set trading_enabled=true,simulation_enabled=true;");
 instrument=(await db.query<{id:string}>("select id from trading_instruments where symbol='XAUUSD'")).rows[0]!.id;
 mocks.rpc.mockImplementation(async(name:string,a:Record<string,unknown>)=>{
  expect(name).toBe("open_simulation_position");
  return (await db.query<{id:string}>("select open_simulation_position($1,$2,$3,$4,$5,$6,$7,$8::jsonb) id",[a.p_user,a.p_instrument,a.p_side,a.p_amount,a.p_sl,a.p_tp,a.p_key,JSON.stringify(a.p_quote)])).rows[0]!.id;
 });
},30000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{
 user=randomUUID();await db.query("insert into auth.users values($1)",[user]);await db.query("insert into profiles(id,role) values($1,'investor')",[user]);
 mocks.identity.mockResolvedValue({id:user,isActive:true});mocks.quote.mockResolvedValue({ok:true,data:quote()});
 mocks.catalogue.mockResolvedValue({source:"supabase",ready:true,settings:{trading_enabled:true,simulation_enabled:true,execution_mode:"SIMULATED"},classes:[{asset_class:"commodities",enabled:true}],instruments:[{id:instrument,symbol:"XAUUSD",enabled:true,trading_enabled:true,buy_enabled:true,sell_enabled:true,asset_class:"commodities",currency:"USD",quote_currency:"USD"}]});
 mocks.rpc.mockClear();
});
describe.sequential("virtual position opening: route through atomic SQL",()=>{
 it.each(["BUY","SELL"])("10,000 USD -> %s 1,000 USD -> 9,000 USD, correct persisted fill",async(side)=>{
  const response=await POST(request(body(side)));expect(response.status).toBe(200);expect(await cash()).toBe(9000);
  const {positionId}=await response.json();const p=(await db.query<Record<string,string>>("select * from simulation_positions where id=$1",[positionId])).rows[0]!;
  expect(p.side).toBe(side);expect(Number(p.invested_amount)).toBe(1000);expect(Number(p.opening_price)).toBe(side==="BUY"?101:99);
  expect(Number(p.units)).toBeCloseTo(1000/(side==="BUY"?101:99),7);expect(p.opening_quote_source).toBe("biquote");expect(p.virtual_account_user_id).toBe(user);
  expect((await db.query("select * from simulation_accounts where user_id=$1",[user])).rows).toHaveLength(0);
 });
 it("retries debit once, conflicting token rejected",async()=>{
  const key=randomUUID();const a=await POST(request(body(),key)),b=await POST(request(body(),key));expect(await a.json()).toEqual(await b.json());expect(await cash()).toBe(9000);
  expect((await POST(request(body("SELL"),key))).status).toBe(409);expect(await cash()).toBe(9000);
 });
 it("competing opens cannot overspend",async()=>{
  const r=await Promise.all([POST(request(body("BUY","6000"))),POST(request(body("SELL","6000")))]);expect(r.map(x=>x.status).sort()).toEqual([200,409]);expect(await cash()).toBe(4000);
 });
 it("rejects insufficient cash without a position or partial account creation",async()=>{
  expect((await POST(request(body("BUY","10001")))).status).toBe(409);expect((await db.query("select * from simulation_positions where user_id=$1",[user])).rows).toHaveLength(0);expect(Number.isNaN(await cash())).toBe(true);
 });
 it.each(["0","-1","NaN","1.001","invalid"])("rejects invalid amount %s",async(amount)=>{expect((await POST(request(body("BUY",amount)))).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();});
 it.each([{timestamp:"2000-01-01T00:00:00Z"},{source:"twelve_data"},{stale:true},{symbol:"BTCUSD"},{marketOpen:false},{bid:"102",ask:"101"},{ask:null,bid:"99"}])("rejects ineligible quote %j",async(extra)=>{
  mocks.quote.mockResolvedValue({ok:true,data:quote(extra as Partial<Quote>)});expect((await POST(request(body()))).status).toBe(409);expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it("rejects missing free data",async()=>{mocks.quote.mockResolvedValue({ok:false,error:"unknown_instrument"});expect((await POST(request(body()))).status).toBe(409);expect(mocks.rpc).not.toHaveBeenCalled();});
 it("accepts legitimate single-price free quote with unknown market status",async()=>{
  mocks.quote.mockResolvedValue({ok:true,data:quote({bid:null,ask:null,marketOpen:false,marketStatusKnown:false,marketState:"unknown"})});expect((await POST(request(body()))).status).toBe(200);expect(await cash()).toBe(9000);
  expect(executionPrice(quote({bid:null,ask:null}),"SELL")).toBe("100");
 });
 it("checks instrument enablement at the server and again in SQL",async()=>{
  const cat=await mocks.catalogue();cat.instruments[0].enabled=false;expect((await POST(request(body()))).status).toBe(409);expect(mocks.rpc).not.toHaveBeenCalled();cat.instruments[0].enabled=true;
  await db.query("update trading_instruments set enabled=false where id=$1",[instrument]);try {expect((await POST(request(body()))).status).toBe(409);}finally{await db.query("update trading_instruments set enabled=true where id=$1",[instrument]);}
 });
 it("rolls cash and position back if event insertion fails",async()=>{
  await db.exec("create function test_event_failure() returns trigger language plpgsql as $$begin raise exception 'injected event failure'; end$$; create trigger test_event_failure before insert on simulation_events for each row execute function test_event_failure();");
  try{expect((await POST(request(body()))).status).toBe(409);expect(Number.isNaN(await cash())).toBe(true);expect((await db.query("select * from simulation_positions where user_id=$1",[user])).rows).toHaveLength(0);}finally{await db.exec("drop trigger test_event_failure on simulation_events; drop function test_event_failure();");}
 });
 it("preserves an older $5,000 balance without using or synchronizing it",async()=>{
  await db.query("select ensure_simulation_account($1)",[user]);expect((await POST(request(body()))).status).toBe(200);expect(await cash()).toBe(9000);
  expect(Number((await db.query<{cash:string}>("select cash::text from simulation_accounts where user_id=$1",[user])).rows[0]!.cash)).toBe(5000);
 });
 it("blocks legacy closing for new positions",async()=>{
  const {positionId}=await (await POST(request(body()))).json();await expect(db.query("select close_simulation_position($1,$2,$3,'MANUAL',$4::jsonb)",[user,positionId,randomUUID(),JSON.stringify(quote())])).rejects.toThrow("not available");expect(await cash()).toBe(9000);
 });
 it("rejects unauthenticated, cross-origin and forged authority fields",async()=>{
  expect((await POST(request(body(),randomUUID(),"https://other.test"))).status).toBe(403);
  for(const field of ["price","units","cash","userId","instrument","stopLoss","takeProfit"])expect((await POST(request({...body(),[field]:"forged"}))).status).toBe(400);
  mocks.identity.mockResolvedValue(null);expect((await POST(request(body()))).status).toBe(401);
 });
 it("has no dependency on real finance tables and denies direct browser writes",async()=>{
  expect((await POST(request(body()))).status).toBe(200);
  // All execution tests run with real finance tables absent.
  await db.exec("set role authenticated");try{await expect(db.exec("update virtual_trading_accounts set cash_usd=1")).rejects.toThrow("permission denied");await expect(db.exec("insert into simulation_positions default values")).rejects.toThrow("permission denied");}finally{await db.exec("reset role");}
 });
});
