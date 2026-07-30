import { NextResponse } from "next/server";
import { platformInvestmentLevelService } from "@/services/platform-investment-level.service";

export async function GET() {
  try {
    const levels = await platformInvestmentLevelService.listAll();
    return NextResponse.json({ levels });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load investment levels";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const level = await platformInvestmentLevelService.create({
      name: body.name,
      minAmount: Number(body.minAmount),
      maxAmount: body.maxAmount != null ? Number(body.maxAmount) : null,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
      isActive: body.isActive ?? true,
    });
    return NextResponse.json({ level }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create investment level";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
