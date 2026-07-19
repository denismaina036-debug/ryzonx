import { NextResponse } from "next/server";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";
import { profitDistributionService } from "@/services/profit-distribution.service";

export async function GET() {
  try {
    const managerId = await poolManagerDashboardService.getManagerId();
    const dashboard = await profitDistributionService.getPoolManagerDashboard(managerId);
    return NextResponse.json({ dashboard });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load dashboard." },
      { status: 400 }
    );
  }
}
