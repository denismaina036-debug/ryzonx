import { apiData, apiError, tradingIdentity } from "@/services/trading/http";
import { readVirtualAccount } from "@/services/trading/virtual-account";
export async function GET() {
  const user = await tradingIdentity();
  if (!user) return apiError("Sign in required", 401);
  try { return apiData({ account: await readVirtualAccount(user.id) }); }
  catch { return apiError("Virtual account unavailable. Please try again shortly."); }
}
