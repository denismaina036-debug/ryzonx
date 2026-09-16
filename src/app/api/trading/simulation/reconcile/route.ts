import { timingSafeEqual } from "node:crypto";
import { reconcileProtection } from "@/services/trading/simulation-service";
import { apiData,apiError,sameOrigin,tradingIdentity } from "@/services/trading/http";
// A scheduler must call GET every minute for protection while users are offline.
export async function GET(request:Request) {
 const secret=process.env.TRADING_WORKER_SECRET;
 const authorization=request.headers.get("authorization")??"";
 const expected=`Bearer ${secret}`;
 if(!secret || authorization.length!==expected.length || !timingSafeEqual(Buffer.from(authorization),Buffer.from(expected))) return apiError("Unauthorized",401);
 try { return apiData(await reconcileProtection()); } catch { return apiError("Protection check unavailable"); }
}
export async function POST(request:Request) {
 const user=await tradingIdentity(); if(!user) return apiError("Sign in required",401);
 if(!sameOrigin(request)) return apiError("Invalid origin",403);
 try { return apiData(await reconcileProtection(user.id)); } catch { return apiError("Protection check unavailable"); }
}
