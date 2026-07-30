import { NextResponse } from "next/server";
import { platformInvestmentLevelService } from "@/services/platform-investment-level.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const level = await platformInvestmentLevelService.update(id, {
      name: body.name,
      minAmount: body.minAmount != null ? Number(body.minAmount) : undefined,
      maxAmount: body.maxAmount !== undefined
        ? body.maxAmount != null
          ? Number(body.maxAmount)
          : null
        : undefined,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
      isActive: body.isActive,
    });
    return NextResponse.json({ level });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update investment level";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await platformInvestmentLevelService.remove(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove investment level";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
