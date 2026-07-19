import { NextResponse } from "next/server";
import { statementService } from "@/services/statement.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

const VALID_TYPES = ["investor", "pool-manager", "platform", "ledger", "settlement"] as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await context.params;
    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid statement type" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get("managerId") ?? undefined;
    const cycleId = searchParams.get("cycleId") ?? undefined;

    switch (type) {
      case "investor": {
        const statement = await statementService.getInvestorStatement();
        return NextResponse.json({
          statement,
          export: statementService.toExportPayload(statement),
        });
      }
      case "pool-manager": {
        if (!managerId) {
          return NextResponse.json({ error: "managerId is required" }, { status: 400 });
        }
        const statement = await statementService.getPoolManagerStatement(
          managerId,
          cycleId ?? undefined
        );
        return NextResponse.json({
          statement,
          export: statementService.toExportPayload(statement),
        });
      }
      case "platform": {
        const statement = await statementService.getPlatformStatement();
        return NextResponse.json({
          statement,
          export: statementService.toExportPayload(statement),
        });
      }
      case "ledger": {
        const statement = await statementService.getLedgerStatement();
        return NextResponse.json({
          statement,
          export: statementService.toExportPayload(statement),
        });
      }
      case "settlement": {
        const statement = await statementService.getSettlementStatement();
        return NextResponse.json({
          statement,
          export: statementService.toExportPayload(statement),
        });
      }
    }
  } catch (error) {
    return errorResponse(error, "Failed to generate statement");
  }
}
