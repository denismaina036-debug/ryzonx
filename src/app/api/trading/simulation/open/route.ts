import { z } from "zod";
import { virtualOpenSchema } from "@/domain/trading/simulation";
import { openSimulation } from "@/services/trading/simulation-service";
import { apiData, apiError, sameOrigin, tradingIdentity } from "@/services/trading/http";
export async function POST(request: Request) {
 const user = await tradingIdentity();
 if (!user) return apiError("Sign in required", 401);
 if (!sameOrigin(request)) return apiError("Invalid origin", 403);
 const input = virtualOpenSchema.safeParse(await request.json().catch(() => null));
 // Transport retry token carries no execution authority.
 const key = z.string().uuid().safeParse(request.headers.get("Idempotency-Key"));
 if (!input.success || !key.success) return apiError("Invalid trade request", 400);
 try { return apiData({ positionId: await openSimulation(user.id, input.data, key.data) }); }
 catch (error) { return apiError(error instanceof Error ? error.message : "Trade unavailable", 409); }
}
