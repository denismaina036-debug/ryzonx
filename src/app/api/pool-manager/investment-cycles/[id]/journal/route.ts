import { NextResponse } from "next/server";
import { tradingJournalService } from "@/services/trading-journal.service";
import { tradeEntryService } from "@/services/trade-entry.service";
import { tradeSnapshotService } from "@/services/trade-snapshot.service";
import { cycleProgressService } from "@/services/cycle-progress.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status =
    message.includes("permissions") || message.includes("Insufficient")
      ? 403
      : message.includes("not found")
        ? 404
        : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const [journal, entries, snapshots, progress] = await Promise.all([
      tradingJournalService.getForManager(id),
      tradeEntryService.listByCycle(id),
      tradeSnapshotService.listByCycle(id),
      cycleProgressService.getSummaryForManager(id),
    ]);
    return NextResponse.json({ journal, entries, snapshots, progress });
  } catch (error) {
    return errorResponse(error, "Failed to load trading journal");
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const journal = await tradingJournalService.getOrCreateForCycle(id);
    return NextResponse.json({ journal }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to open trading journal");
  }
}
