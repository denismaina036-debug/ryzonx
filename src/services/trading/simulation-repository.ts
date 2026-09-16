import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, getServerEnv } from "@/lib/env";
import { z } from "zod";
import { accountSchema, positionSchema } from "@/domain/trading/simulation";
import type { Json } from "@/types/database.types";
type Table<R> = { Row:R; Insert:Partial<R>; Update:Partial<R>; Relationships:[] };
type Database = { public: { Tables: { simulation_accounts: Table<z.infer<typeof accountSchema>>; simulation_positions: Table<z.infer<typeof positionSchema>> }; Views: Record<string,never>; Functions: Record<string,{ Args:Record<string,Json|undefined>; Returns:Json }> } };
function db() { return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL,getServerEnv().SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}); }
const fields="*,invested_amount::text,units::text,opening_price::text,closing_price::text,stop_loss::text,take_profit::text,realized_pl::text";
export const simulationRepository = {
  async snapshot(userId:string) {
    const {data,error}=await db().rpc("simulation_snapshot",{p_user:userId});
    if(error) throw new Error("Simulation database unavailable. Migrations 00084 and 00085 are required.");
    return z.object({account:accountSchema.nullable(),positions:z.array(positionSchema)}).parse(data);
  },
  async account(userId:string) {
    const {data,error}=await db().from("simulation_accounts").select("*,cash::text,starting_cash::text,realized_pl::text").eq("user_id",userId).maybeSingle();
    if(error) throw new Error("Simulation database unavailable. Migrations 00084 and 00085 are required.");
    return data ? accountSchema.parse(data) : null;
  },
  async positions(userId:string) {
    const {data,error}=await db().from("simulation_positions").select(fields).eq("user_id",userId).order("opened_at",{ascending:false});
    if(error) throw new Error("Simulation positions unavailable.");
    return z.array(positionSchema).parse(data);
  },
  async openPositions() {
    const batch=await db().rpc("simulation_protection_batch",{});
    if(batch.error) throw new Error("Protection batch unavailable.");
    const ids=z.array(z.string().uuid()).parse(batch.data);
    if(!ids.length)return [];
    const {data,error}=await db().from("simulation_positions").select(fields).eq("status","OPEN").in("id",ids).order("id");
    if(error) throw new Error("Simulation positions unavailable.");
    return z.array(positionSchema).parse(data);
  },
  async rpc(name:string,args:Record<string,Json|undefined>) {
    const {data,error}=await db().rpc(name,args);
    // Only explicitly allow-listed domain errors cross this boundary.
    if(error) {
      const safe=["Insufficient simulation cash","Insufficient virtual cash","Virtual account unavailable","Simulation trading disabled","Simulation disabled","Side disabled","Instrument disabled","Asset class disabled","Fresh quote required","Invalid amount","Invalid stop loss","Invalid take profit","Idempotency key already used","Create a simulation account first","Position not found","Amount below minimum quantity"];
      throw new Error(safe.includes(error.message) ? error.message : "Simulation transaction could not be completed. Check database configuration and try again.");
    }
    return data;
  }
};
