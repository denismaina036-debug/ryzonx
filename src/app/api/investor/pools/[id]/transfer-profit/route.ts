import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ROUTES } from "@/constants/routes";
import { poolParticipationService } from "@/services/pool-participation.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fundId } = await params;
    const body = (await request.json().catch(() => ({}))) as { amount?: number };
    const result = await poolParticipationService.transferProfitToWallet(
      fundId,
      body.amount
    );

    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.investments);
    revalidatePath(ROUTES.transactions);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transfer failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
