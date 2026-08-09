import { NextResponse } from "next/server";
import { managedPoolService } from "@/services/managed-pool.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await managedPoolService.loadRoiFormData(id);
    return NextResponse.json({
      multipliers: data.roiMultipliers,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load ROI settings." },
      { status: 400 }
    );
  }
}
