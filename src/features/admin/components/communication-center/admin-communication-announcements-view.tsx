"use client";

import { useCallback, useState } from "react";
import { Archive, Megaphone, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ANNOUNCEMENT_CATEGORIES } from "@/constants/communication-center";
import { cn } from "@/lib/utils";
import type { AnnouncementRecord } from "@/services/communication/announcement-center.service";

export function AdminCommunicationAnnouncementsView({
  initialAnnouncements,
}: {
  initialAnnouncements: AnnouncementRecord[];
}) {
  const [items, setItems] = useState(initialAnnouncements);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("platform_update");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/communication/announcements");
    const data = await res.json();
    if (res.ok) setItems(data.announcements ?? []);
  }, []);

  async function createAnnouncement() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/communication/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      toast.success("Announcement created");
      setTitle("");
      setContent("");
      setShowForm(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function publish(id: string) {
    const res = await fetch(`/api/admin/communication/announcements/${id}/publish`, { method: "POST" });
    if (res.ok) {
      toast.success("Published");
      await refresh();
    }
  }

  async function archive(id: string) {
    const res = await fetch(`/api/admin/communication/announcements/${id}/archive`, { method: "POST" });
    if (res.ok) {
      toast.success("Archived");
      await refresh();
    }
  }

  const statusColors: Record<string, string> = {
    draft: "bg-navy-100 text-navy-600",
    scheduled: "bg-amber-100 text-amber-700",
    published: "bg-emerald-100 text-emerald-700",
    archived: "bg-navy-100 text-navy-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New announcement
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Announcement content…"
            className="min-h-[120px] w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            {ANNOUNCEMENT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <Button type="button" size="sm" disabled={saving} onClick={createAnnouncement}>
            Save draft
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((a) => (
          <article key={a.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <Megaphone className="h-5 w-5 shrink-0 text-royal-500" />
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", statusColors[a.status] ?? statusColors.draft)}>
                {a.status}
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-navy-900">{a.title}</h3>
            <p className="mt-1 line-clamp-3 text-sm text-navy-500">{a.content}</p>
            <p className="mt-2 text-xs capitalize text-navy-400">{a.category.replace(/_/g, " ")}</p>
            <div className="mt-4 flex gap-2">
              {a.status !== "published" && (
                <Button type="button" size="sm" onClick={() => publish(a.id)}>Publish</Button>
              )}
              {a.status !== "archived" && (
                <Button type="button" size="sm" variant="outline" onClick={() => archive(a.id)}>
                  <Archive className="mr-1 h-3.5 w-3.5" /> Archive
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
