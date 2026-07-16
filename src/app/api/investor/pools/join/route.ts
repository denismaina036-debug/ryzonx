import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ROUTES } from "@/constants/routes";
import { poolParticipationService } from "@/services/pool-participation.service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { fundId: string; amount: number };

    if (!body.fundId || !body.amount) {
      return NextResponse.json(
        { error: "Pool and amount are required." },
        { status: 400 }
      );
    }

    await poolParticipationService.joinPool(body.fundId, body.amount);

    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.investments);
    revalidatePath(ROUTES.marketplace);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pool join failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
