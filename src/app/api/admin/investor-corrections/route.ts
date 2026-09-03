import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { adminInvestorCorrectionService } from "@/services/admin-investor-correction.service";

export async function GET(request: Request) {
  try {
    const email = new URL(request.url).searchParams.get("email") ?? "";
    if (!email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    return NextResponse.json({ investor: await adminInvestorCorrectionService.findByEmail(email) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Search failed" }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  try {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = await request.json() as { kind: "deposit" | "investment"; id: string; amount: number; reason: string };
    await adminInvestorCorrectionService.correct({ ...body, actorId: admin.id });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Correction failed" }, { status: 400 }); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const { investorId } = await request.json() as { investorId: string };
    if (!investorId) return NextResponse.json({ error: "Investor is required." }, { status: 400 });
    const withdrawalHold = await adminInvestorCorrectionService.allowWithdrawals(
      investorId,
      admin.id
    );
    return NextResponse.json({ ok: true, withdrawalHold });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Release failed" }, { status: 400 }); }
}
