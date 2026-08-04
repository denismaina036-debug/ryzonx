import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { cycleProgressService } from "@/services/cycle-progress.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const user = await getCurrentUser();
    const progress = await cycleProgressService.getInvestorViewBySlug(slug, {
      investorUserId: user?.id ?? null,
    });
    if (!progress) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }
    return NextResponse.json({ progress });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load cycle progress";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
