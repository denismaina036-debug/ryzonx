import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { ratingEngineService } from "@/services/rating-engine.service";

export async function POST() {
  try {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    const result = await ratingEngineService.recalculateAll(user.id);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recalculation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
