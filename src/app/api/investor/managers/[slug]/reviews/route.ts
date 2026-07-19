import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { poolManagerReviewService } from "@/services/pool-manager-review.service";

async function resolveManagerId(slug: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db.from("pool_managers").select("id").eq("slug", slug).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const managerId = await resolveManagerId(slug);
    if (!managerId) {
      return NextResponse.json({ error: "Manager not found." }, { status: 404 });
    }
    const summary = await poolManagerReviewService.getSummary(managerId);
    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load reviews." },
      { status: 400 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const managerId = await resolveManagerId(slug);
    if (!managerId) {
      return NextResponse.json({ error: "Manager not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      investmentCycleId?: string;
      investmentAllocationId?: string;
      rating?: number;
      message?: string;
    };

    if (
      !body.investmentCycleId ||
      !body.investmentAllocationId ||
      body.rating == null ||
      !body.message
    ) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const review = await poolManagerReviewService.submit({
      poolManagerId: managerId,
      investmentCycleId: body.investmentCycleId,
      investmentAllocationId: body.investmentAllocationId,
      rating: body.rating,
      message: body.message,
    });

    return NextResponse.json({ review });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit review." },
      { status: 400 }
    );
  }
}
