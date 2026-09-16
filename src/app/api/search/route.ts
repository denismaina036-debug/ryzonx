import { apiData, apiError, tradingIdentity } from "@/services/trading/http";
import { unifiedSearch } from "@/services/search.service";
export async function GET(request: Request) {
  if (!await tradingIdentity()) return apiError("Sign in to search", 401);
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 80) return apiError("Enter between 2 and 80 characters", 400);
  return apiData(await unifiedSearch(query));
}
