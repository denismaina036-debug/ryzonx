import { closeTradeSchema } from "@/domain/trading/simulation";
import { closeSimulation } from "@/services/trading/simulation-service";
import { apiData,apiError,sameOrigin,tradingIdentity } from "@/services/trading/http";
export async function POST(request:Request) {
 const user=await tradingIdentity(); if(!user) return apiError("Sign in required",401);
 if(!sameOrigin(request)) return apiError("Invalid origin",403);
 const input=closeTradeSchema.safeParse(await request.json().catch(()=>null));
 if(!input.success) return apiError("Invalid close request",400);
 try { return apiData({positionId:await closeSimulation(user.id,input.data.position,input.data.idempotencyKey)}); }
 catch(error) { return apiError(error instanceof Error ? error.message : "Close unavailable",409); }
}
