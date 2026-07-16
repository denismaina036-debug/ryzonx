import { NextResponse } from "next/server";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";

export async function GET() {
  try {
    const pools = await poolManagerDashboardService.getMyPools();
    return NextResponse.json({ pools });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load pools";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name: string;
      slug?: string;
      description?: string;
      minInvestment?: number;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Pool name is required" }, { status: 400 });
    }

    const pool = await poolManagerDashboardService.createPoolDraft(body);
    return NextResponse.json({ pool });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
