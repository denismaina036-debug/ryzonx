import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { managerRatingService } from "@/services/manager-rating.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const db = createAdminClient();
    const { data } = await db.from("pool_managers").select("id").eq("slug", slug).maybeSingle();
    if (!data) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }
    const rating = await managerRatingService.getInvestorView((data as { id: string }).id);
    if (!rating) {
      return NextResponse.json({ error: "Rating unavailable" }, { status: 404 });
    }
    return NextResponse.json({ rating });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load rating";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
