import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), user: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.test" }, getServerEnv: () => ({ SUPABASE_SERVICE_ROLE_KEY: "test" }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
import { readVirtualAccount } from "./virtual-account";
import { GET } from "@/app/api/trading/virtual-account/route";
let db: PGlite;
const user = "00000000-0000-4000-8000-000000000001", other = "00000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated;");
  await db.query("insert into auth.users values ($1),($2)", [user, other]);
  await db.exec(readFileSync("supabase/migrations/00086_virtual_trading_accounts.sql", "utf8"));
  // Sentinels make any accidental financial dependency visible.
  await db.exec("create table wallets(balance numeric); insert into wallets values(123.45); create table investments(amount numeric); insert into investments values(678.90);");
  mocks.rpc.mockImplementation(async (name: string, args: { p_user: string }) => {
    expect(name).toBe("ensure_virtual_trading_account");
    const result = await db.query<{ account: unknown }>("select ensure_virtual_trading_account($1) as account", [args.p_user]);
    return { data: result.rows[0]!.account, error: null };
  });
}, 30000);
afterAll(async () => { await db?.close(); });
describe.sequential("isolated virtual account foundation", () => {
  it("creates one persistent $10,000 account safely on first use", async () => {
    const [a,b] = await Promise.all([readVirtualAccount(user), readVirtualAccount(user)]);
    expect(a).toEqual(b);
    expect(a).toMatchObject({ user_id: user, cash_usd: "10000.00", starting_balance_usd: "10000.00" });
    expect(a.created_at).toBeTruthy(); expect(a.updated_at).toBeTruthy();
    expect((await db.query("select * from virtual_trading_accounts")).rows).toHaveLength(1);
  });
  it("does not reset an existing account or replace its timestamps", async () => {
    const before = await readVirtualAccount(user);
    await db.query("update virtual_trading_accounts set cash_usd=8765.43 where user_id=$1", [user]);
    expect(await readVirtualAccount(user)).toEqual({ ...before, cash_usd: "8765.43" });
  });
  it("isolates users through the authenticated API and database permissions", async () => {
    mocks.user.mockResolvedValue({ id: other, isActive: true });
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).account).toMatchObject({ user_id: other, cash_usd: "10000.00" });
    expect((await readVirtualAccount(user)).cash_usd).toBe("8765.43");
    mocks.user.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
    await db.exec("set role authenticated");
    try {
      expect((await db.query<{ user_id: string }>("select user_id from virtual_trading_accounts")).rows).toEqual([{ user_id: user }]);
      await expect(db.query("select ensure_virtual_trading_account($1)", [other])).rejects.toThrow(/permission denied/);
      await expect(db.exec("update virtual_trading_accounts set cash_usd=99999")).rejects.toThrow(/permission denied/);
    } finally { await db.exec("reset role"); }
  });
  it("never interacts with real balances or requires investment infrastructure", async () => {
    await readVirtualAccount(user); await readVirtualAccount(other);
    expect((await db.query("select balance::text from wallets")).rows).toEqual([{ balance: "123.45" }]);
    expect((await db.query("select amount::text from investments")).rows).toEqual([{ amount: "678.90" }]);
    expect(mocks.rpc.mock.calls.every(([name]) => name === "ensure_virtual_trading_account")).toBe(true);
    // The migration/service also work when those finance tables do not exist.
    await db.exec("drop table wallets; drop table investments;");
    expect((await readVirtualAccount(user)).cash_usd).toBe("8765.43");
  });
});
