import { NextResponse } from "next/server";
import { investorFollowService } from "@/services/investor-follow.service";

export async function GET() {
  try {
    const following = await investorFollowService.listFollowing();
    return NextResponse.json({ following });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load follows." },
      { status: 403 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { poolManagerId?: string };
    if (!body.poolManagerId) {
      return NextResponse.json({ error: "poolManagerId is required." }, { status: 400 });
    }
    await investorFollowService.follow(body.poolManagerId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to follow." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { poolManagerId?: string };
    if (!body.poolManagerId) {
      return NextResponse.json({ error: "poolManagerId is required." }, { status: 400 });
    }
    await investorFollowService.unfollow(body.poolManagerId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to unfollow." },
      { status: 400 }
    );
  }
}
