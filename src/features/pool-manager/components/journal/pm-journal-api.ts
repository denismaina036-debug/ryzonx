"use client";

import type {
  CloseTradeEntryInput,
  CreateTradeEntryInput,
  CycleProgressSummary,
  TradeEntry,
  TradeJournal,
  TradeSnapshot,
  UpdateTradeEntryInput,
} from "@/domain/trading-journal/types";

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export interface JournalWorkspaceData {
  journal: TradeJournal | null;
  entries: TradeEntry[];
  snapshots: TradeSnapshot[];
  progress: CycleProgressSummary;
}

export async function fetchJournalWorkspace(cycleId: string): Promise<JournalWorkspaceData> {
  return parseJson(await fetch(`/api/pool-manager/investment-cycles/${cycleId}/journal`));
}

export async function openJournal(cycleId: string): Promise<TradeJournal> {
  const data = await parseJson<{ journal: TradeJournal }>(
    await fetch(`/api/pool-manager/investment-cycles/${cycleId}/journal`, { method: "POST" })
  );
  return data.journal;
}

export async function createTradeEntry(
  cycleId: string,
  body: CreateTradeEntryInput
): Promise<TradeEntry> {
  const data = await parseJson<{ entry: TradeEntry }>(
    await fetch(`/api/pool-manager/investment-cycles/${cycleId}/journal/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return data.entry;
}

export async function updateDraftEntry(
  cycleId: string,
  entryId: string,
  body: UpdateTradeEntryInput
): Promise<TradeEntry> {
  const data = await parseJson<{ entry: TradeEntry }>(
    await fetch(`/api/pool-manager/investment-cycles/${cycleId}/journal/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return data.entry;
}

export async function openTradeEntry(cycleId: string, entryId: string): Promise<TradeEntry> {
  const data = await parseJson<{ entry: TradeEntry }>(
    await fetch(`/api/pool-manager/investment-cycles/${cycleId}/journal/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open" }),
    })
  );
  return data.entry;
}

export async function updateOpenEntry(
  cycleId: string,
  entryId: string,
  body: UpdateTradeEntryInput
): Promise<TradeEntry> {
  const data = await parseJson<{ entry: TradeEntry }>(
    await fetch(
      `/api/pool-manager/investment-cycles/${cycleId}/journal/entries/${entryId}/open`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )
  );
  return data.entry;
}

export async function closeTradeEntry(
  cycleId: string,
  entryId: string,
  body: CloseTradeEntryInput
): Promise<TradeEntry> {
  const data = await parseJson<{ entry: TradeEntry }>(
    await fetch(
      `/api/pool-manager/investment-cycles/${cycleId}/journal/entries/${entryId}/close`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )
  );
  return data.entry;
}

export async function createSnapshot(cycleId: string, notes?: string): Promise<TradeSnapshot> {
  const data = await parseJson<{ snapshot: TradeSnapshot }>(
    await fetch(`/api/pool-manager/investment-cycles/${cycleId}/journal/snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    })
  );
  return data.snapshot;
}
