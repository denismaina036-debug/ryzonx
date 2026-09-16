import { apiData,apiError,sameOrigin,tradingIdentity } from "@/services/trading/http";
import { simulationSnapshot } from "@/services/trading/simulation-service";
import { simulationRepository } from "@/services/trading/simulation-repository";
import { readCatalogue } from "@/services/trading/repository";
export async function GET() {
 const user=await tradingIdentity(); if(!user) return apiError("Sign in required",401);
 try { return apiData(await simulationSnapshot(user.id)); }
 catch { return apiError("Simulation database unavailable. Migrations 00084 and 00085 are required."); }
}
export async function POST(request:Request) {
 const user=await tradingIdentity(); if(!user) return apiError("Sign in required",401);
 if(!sameOrigin(request)) return apiError("Invalid origin",403);
 try {
  if((await readCatalogue()).source!=="supabase") return apiError("Simulation requires the migrated database catalogue.",409);
  await simulationRepository.rpc("ensure_simulation_account",{p_user:user.id});
  return apiData(await simulationSnapshot(user.id));
 } catch { return apiError("Simulation account could not be created. Check database setup and simulation controls.",409); }
}
