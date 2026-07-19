import { NextResponse } from "next/server";
import { managedPoolService } from "@/services/managed-pool.service";

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
    const body = (await request.json()) as {
      name?: string;
      openingDate?: string;
      closingDate?: string;
    };
    const cycle = await managedPoolService.createCycle(id, body);
    return NextResponse.json({ cycle });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create cycle." },
      { status: 400 }
    );
  }
}
