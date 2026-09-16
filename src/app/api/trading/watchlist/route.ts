import { z } from "zod";
import { readCatalogue, readWatchlist, setWatchlist } from "@/services/trading/repository";
import { apiData, apiError, sameOrigin, tradingIdentity } from "@/services/trading/http";
export async function GET() {
  const user = await tradingIdentity();
  if (!user) return apiError("Sign in to view your watchlist", 401);
  try { return apiData({ ids: await readWatchlist(user.id) }); }
  catch { return apiError("Your watchlist is temporarily unavailable"); }
}
export async function POST(request: Request) {
  const user = await tradingIdentity();
  if (!user) return apiError("Sign in to save a market", 401);
  if (!sameOrigin(request)) return apiError("Invalid request origin", 403);
  const input = z.object({ instrumentId: z.string().uuid(), saved: z.boolean() }).strict().safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("Invalid watchlist request", 400);
  const catalogue = await readCatalogue();
  if (!catalogue.instruments.some(i => i.id === input.data.instrumentId)) return apiError("Market unavailable", 404);
  try { await setWatchlist(user.id, input.data.instrumentId, input.data.saved); return apiData({ saved: input.data.saved }); }
  catch { return apiError("Your watchlist could not be updated"); }
}
