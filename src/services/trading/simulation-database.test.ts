import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { beforeAll,afterAll,describe,it,expect } from "vitest";
import { markPosition,simulationTotals } from "@/domain/trading/simulation";
let db:PGlite; const user=randomUUID(), other=randomUUID(), admin=randomUUID(); let instrument:string;
const quote=(price="4000",extra={})=>JSON.stringify({symbol:"XAUUSD",source:"twelve_data",timestamp:new Date().toISOString(),marketOpen:true,price,bid:null,ask:null,...extra});
async function cash(who=user) {return (await db.query<{cash:string}>("select cash::text from simulation_accounts where user_id=$1",[who])).rows[0]?.cash;}
async function open(amount="1000",side="BUY",key=randomUUID(),q=quote(),who=user,sl:string|null=null,tp:string|null=null) {return (await db.query<{id:string}>("select open_simulation_position($1,$2,$3,$4,$5,$6,$7,$8::jsonb) as id",[who,instrument,side,amount,sl,tp,key,q])).rows[0]!.id;}
async function close(id:string,price="4320",key=randomUUID(),reason="MANUAL",who=user) {return db.query("select close_simulation_position($1,$2,$3,$4,$5::jsonb)",[who,id,key,reason,quote(price)]);}
beforeAll(async()=>{
 db=new PGlite();
 await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; create table public.profiles(id uuid primary key,role text,is_active boolean not null default true);");
 await db.query("insert into profiles(id,role) values($1,'investor'),($2,'investor'),($3,'administrator')",[user,other,admin]);
 await db.exec(readFileSync("supabase/migrations/00084_trading_stage_one.sql","utf8"));
 await db.exec(readFileSync("supabase/migrations/00085_simulation_trading.sql","utf8"));
 await db.exec("update trading_settings set trading_enabled=true,simulation_enabled=true,stop_loss_enabled=true,take_profit_enabled=true;");
 instrument=(await db.query<{id:string}>("select id from trading_instruments where symbol='XAUUSD'")).rows[0]!.id;
 await db.query("select ensure_simulation_account($1)",[user]);
 await db.query("select ensure_simulation_account($1)",[other]);
},30000);
afterAll(async()=>{await db?.close();});
describe.sequential("actual PostgreSQL simulation transactions",()=>{
 it("golden BUY path reconciles cash, mark and close",async()=>{
  const id=await open(); expect(Number(await cash())).toBe(4000);
  const row=(await db.query<{units:string}>("select units::text from simulation_positions where id=$1",[id])).rows[0]!;
  expect(Number(row.units)).toBe(.25);
  const p={side:"BUY" as const,opening_price:"4000",units:"0.25",invested_amount:"1000"};
  expect(markPosition(p,"4000").pl).toBe("0");
  const mark=markPosition(p,"4320");expect(mark).toMatchObject({pl:"80",value:"1080",plPercent:"8"});
  expect(simulationTotals("4000",[{...p,mark}]).portfolioValue).toBe("5080");
  await close(id);expect(Number(await cash())).toBe(5080);
  await close(id);expect(Number(await cash())).toBe(5080);
 });
 it("losing BUY and profitable SELL settle correct direction",async()=>{
  const buy=await open();await close(buy,"3680");expect(Number(await cash())).toBe(5000);
  const sell=await open("1000","SELL");await close(sell,"3680");expect(Number(await cash())).toBe(5080);
 });
 it("short losses are capped at invested allocation",async()=>{
  const id=await open("1000","SELL");await close(id,"10000");expect(Number(await cash())).toBe(4080);
 });
 it("retries and concurrent requests cannot overspend or duplicate",async()=>{
  const key=randomUUID();const ids=await Promise.all([open("3000","BUY",key),open("3000","BUY",key)]);expect(ids[0]).toBe(ids[1]);expect(Number(await cash())).toBe(1080);
  await expect(open("2000")).rejects.toThrow("Insufficient");
  await expect(open("100","BUY",key)).rejects.toThrow("Idempotency");
  await Promise.all([close(ids[0],"4000"),close(ids[0],"4000")]);expect(Number(await cash())).toBe(4080);
 });
 it("rejects invalid amount, stale and mismatched quotes",async()=>{
  for(const amount of ["0","-1","NaN"])await expect(open(amount)).rejects.toThrow();
  await expect(open("100","BUY",randomUUID(),quote("4000",{timestamp:"2000-01-01T00:00:00Z"}))).rejects.toThrow("Fresh");
  await expect(open("100","BUY",randomUUID(),quote("4000",{symbol:"BTCUSD"}))).rejects.toThrow("quote");
  await expect(open("100","BUY",randomUUID(),quote("4000",{marketOpen:false}))).rejects.toThrow("quote");
 });
 it("enforces global, class, instrument and side switches",async()=>{
  for(const column of ["trading_enabled","simulation_enabled","buy_enabled"]) {await db.exec(`update trading_settings set ${column}=false`);await expect(open()).rejects.toThrow();await db.exec(`update trading_settings set ${column}=true`);}
  await db.exec("update trading_settings set sell_enabled=false");await expect(open("100","SELL")).rejects.toThrow();await db.exec("update trading_settings set sell_enabled=true");
  await db.query("update trading_instruments set enabled=false where id=$1",[instrument]);await expect(open()).rejects.toThrow();await db.query("update trading_instruments set enabled=true where id=$1",[instrument]);
 });
 it("triggers SL/TP through the same close transaction only at the boundary",async()=>{
  const id=await open("1000","BUY",randomUUID(),quote(),user,"3900","4320");
  await expect(close(id,"4100",randomUUID(),"TAKE_PROFIT")).rejects.toThrow("not triggered");
  await close(id,"4320",randomUUID(),"TAKE_PROFIT");
  const short=await open("1000","SELL",randomUUID(),quote(),user,"4100","3800");await close(short,"4200",randomUUID(),"STOP_LOSS");
 });
 it("starting balance change never rewrites existing cash",async()=>{
  const before=await cash();await db.exec("update trading_settings set default_simulation_balance=9000");await db.query("select ensure_simulation_account($1)",[user]);expect(await cash()).toBe(before);
  await db.query("select ensure_simulation_account($1)",[admin]);expect(Number(await cash(admin))).toBe(9000);
 });
 it("distinct concurrent orders cannot overspend and snapshots reconcile journal cash",async()=>{
  const results=await Promise.allSettled([open("4000","BUY",randomUUID(),quote(),other),open("4000","BUY",randomUUID(),quote(),other)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(Number(await cash(other))).toBe(1000);
  const id=(results.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<string>).value;
  await close(id,"4000",randomUUID(),"MANUAL",other);
  const snapshot=(await db.query<{data:{account:{cash:string},positions:unknown[]}}>("select simulation_snapshot($1) as data",[other])).rows[0]!.data;
  expect(Number(snapshot.account.cash)).toBe(5000);expect(snapshot.positions).toHaveLength(1);
  const sum=(await db.query<{total:string}>("select sum(cash_delta)::text as total from simulation_events where user_id=$1",[other])).rows[0]!.total;
  expect(Number(sum)).toBe(Number(snapshot.account.cash));
 });
 it("owner isolation, read-only RLS, immutable environment and journal",async()=>{
  const id=await open("100");await expect(close(id,"4000",randomUUID(),"MANUAL",other)).rejects.toThrow("not found");
  await expect(db.query("update simulation_positions set environment='LIVE' where id=$1",[id])).rejects.toThrow();
  await expect(db.exec("delete from simulation_events")).rejects.toThrow("cannot be deleted");
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${other}';`);
  expect((await db.query<{user_id:string}>("select * from simulation_positions")).rows.every(p=>p.user_id===other)).toBe(true);
  await expect(db.exec("update simulation_accounts set cash=99999")).rejects.toThrow("permission denied");
  await expect(db.query("select ensure_simulation_account($1)",[other])).rejects.toThrow("permission denied");
  await db.exec("reset role;");
 });
});
