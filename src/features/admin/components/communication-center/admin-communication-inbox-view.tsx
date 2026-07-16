"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Flag, Mail, MailOpen, RefreshCw, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

interface InboxItem {
  id: string;
  type: string;
  sender: string;
  senderEmail: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assignedAdmin: string | null;
  date: string;
  unread: boolean;
}

export function AdminCommunicationInboxView({
  initialItems,
}: {
  initialItems: InboxItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<"date" | "priority">("date");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, query });
      const res = await fetch(`/api/admin/communication/inbox?${params}`);
      const data = await res.json();
      if (res.ok) setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  useEffect(() => {
    const timer = setTimeout(refresh, 300);
    return () => clearTimeout(timer);
  }, [refresh]);

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sort === "priority") {
      copy.sort((a, b) => (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1));
    } else {
      copy.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return copy;
  }, [items, sort]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkMarkRead() {
    setItems((prev) =>
      prev.map((i) => (selected.has(i.id) ? { ...i, unread: false, status: "replied" } : i))
    );
    setSelected(new Set());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sender, subject, email…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "open", "replied", "closed"] as const).map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setSort(sort === "date" ? "priority" : "date")}>
            Sort: {sort}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={loading} onClick={refresh}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-royal-100 bg-royal-50/50 px-4 py-2">
          <span className="text-xs font-semibold text-royal-700">{selected.size} selected</span>
          <Button type="button" size="sm" variant="outline" onClick={bulkMarkRead}>
            <MailOpen className="mr-1 h-3.5 w-3.5" /> Mark read
          </Button>
          <Button type="button" size="sm" variant="outline">
            <Archive className="mr-1 h-3.5 w-3.5" /> Archive
          </Button>
          <Button type="button" size="sm" variant="outline">
            <UserPlus className="mr-1 h-3.5 w-3.5" /> Assign
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-navy-400">
              <th className="px-4 py-3 w-8" />
              <th className="px-4 py-3">Sender</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-navy-400">
                  No conversations match your filters.
                </td>
              </tr>
            ) : (
              sorted.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-border/60 hover:bg-navy-50/50",
                    item.unread && "bg-royal-50/30"
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.unread && <span className="h-2 w-2 rounded-full bg-royal-500" />}
                      <div>
                        <p className="font-medium text-navy-900">{item.sender}</p>
                        <p className="text-xs text-navy-400">{item.senderEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{item.subject}</td>
                  <td className="px-4 py-3 capitalize">{item.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        item.priority === "high" ? "bg-red-100 text-red-700" : "bg-navy-100 text-navy-600"
                      )}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{item.status}</td>
                  <td className="px-4 py-3 text-xs text-navy-500">
                    {new Date(item.date).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant="ghost" asChild>
                        <Link href={`${ROUTES.adminCommunicationSupport}?ticket=${item.id}`}>
                          <Mail className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button type="button" size="sm" variant="ghost">
                        <Flag className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
