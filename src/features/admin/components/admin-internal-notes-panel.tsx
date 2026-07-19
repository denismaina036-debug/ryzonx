"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AdminInternalNote } from "@/services/admin-notes.service";

async function fetchNotes(entityType: string, entityId: string): Promise<AdminInternalNote[]> {
  const res = await fetch(
    `/api/admin/notes?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
  );
  if (!res.ok) throw new Error("Failed to load notes");
  const data = (await res.json()) as { notes: AdminInternalNote[] };
  return data.notes;
}

async function postNote(entityType: string, entityId: string, note: string): Promise<AdminInternalNote> {
  const res = await fetch("/api/admin/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType, entityId, note }),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? "Failed to save note");
  }
  const data = (await res.json()) as { note: AdminInternalNote };
  return data.note;
}

export function AdminInternalNotesPanel({
  entityType,
  entityId,
  initialNotes,
}: {
  entityType: string;
  entityId: string;
  initialNotes: AdminInternalNote[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!draft.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const note = await postNote(entityType, entityId, draft.trim());
      setNotes((prev) => [note, ...prev]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchNotes(entityType, entityId);
      setNotes(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh notes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-navy-900">Internal Notes</h3>
          <p className="text-xs text-navy-500">Visible to administrators only. Never shown to investors or managers.</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={handleRefresh}>
          Refresh
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an internal review note…"
          rows={3}
          className="resize-none"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="button" disabled={loading || !draft.trim()} onClick={handleSubmit}>
          Save Note
        </Button>
      </div>

      <ul className="mt-6 space-y-3">
        {notes.length === 0 ? (
          <li className="text-sm text-navy-500">No internal notes yet.</li>
        ) : (
          notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-border/60 bg-navy-50/40 p-3">
              <p className="text-sm text-navy-800 whitespace-pre-wrap">{note.note}</p>
              <p className="mt-2 text-xs text-navy-500">
                {note.actorName} · {new Date(note.createdAt).toLocaleString()}
              </p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
