import { NextResponse } from "next/server";
import { managedPoolService } from "@/services/managed-pool.service";
import type { CreatePoolInvestmentCycleInput } from "@/domain/investment/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cycles = await managedPoolService.listCycles(id);
    return NextResponse.json({ cycles });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load cycles." },
      { status: 400 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as CreatePoolInvestmentCycleInput;
    const cycle = await managedPoolService.createCycle(id, {
      ...body,
      fundId: id,
    });
    return NextResponse.json({ cycle });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create cycle." },
      { status: 400 }
    );
  }
}
