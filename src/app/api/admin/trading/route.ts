import { z } from "zod";
import { classSchema, instrumentControlsSchema, settingsSchema } from "@/domain/trading/models";
import { readCatalogue, updateConfiguration } from "@/services/trading/repository";
import { providerStatus } from "@/services/trading/provider";
import { apiData, apiError, sameOrigin, tradingIdentity } from "@/services/trading/http";
const updateSchema = z.union([
  z.object({ kind: z.literal("settings"), value: settingsSchema }).strict(),
  z.object({ kind: z.literal("class"), value: classSchema }).strict(),
  z.object({ kind: z.literal("instrument"), id: z.string().uuid(), value: instrumentControlsSchema }).strict(),
]);
export async function GET() {
  if (!await tradingIdentity(true)) return apiError("Administrator access required", 403);
  return apiData({ ...await readCatalogue(), provider: providerStatus() });
}
export async function PATCH(request: Request) {
  const user = await tradingIdentity(true);
  if (!user) return apiError("Administrator access required", 403);
  if (!sameOrigin(request)) return apiError("Invalid request origin", 403);
  const input = updateSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("Invalid controls. Live execution and futures remain disabled; check amount limits.", 400);
  const { kind, value } = input.data;
  const target = input.data.kind === "instrument" ? input.data.id : input.data.kind === "class" ? input.data.value.asset_class : "platform";
  try { await updateConfiguration(user.id, kind, target, value); return apiData({ saved: true }); }
  catch { return apiError("Trading settings could not be saved. Please retry."); }
}
