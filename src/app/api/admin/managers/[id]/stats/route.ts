import { NextResponse } from "next/server";
import { poolManagerStatsService } from "@/services/pool-manager-stats.service";
import type { PoolManagerAdminStatistics } from "@/domain/pool-manager/admin-statistics";
import type { PoolManagerStatField } from "@/domain/pool-manager/admin-statistics";
import { friendlyStatSaveError } from "@/domain/pool-manager/stat-validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stats = await poolManagerStatsService.getStatistics(id);
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load statistics.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      patch?: Partial<PoolManagerAdminStatistics>;
      reason?: string;
    };
    const stats = await poolManagerStatsService.updateStatistics({
      managerId: id,
      patch: body.patch ?? {},
      reason: body.reason,
    });
    return NextResponse.json(stats);
  } catch (err) {
    const message = friendlyStatSaveError(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      action?: "reset";
      fields?: PoolManagerStatField[];
      reason?: string;
    };

    if (body.action !== "reset") {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    const stats = await poolManagerStatsService.resetStatistics({
      managerId: id,
      fields: body.fields,
      reason: body.reason,
    });
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reset failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
