"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Eye, RefreshCw, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OutboxRow {
  id: string;
  recipientName: string;
  recipientEmail: string;
  template_slug: string | null;
  status: string;
  category: string;
  rendered_subject: string | null;
  created_at: string;
  triggered_by: string | null;
  communication_deliveries?: Array<{ channel: string; status: string; sent_at: string | null }>;
}

export function AdminCommunicationOutboxView({
  initialRows,
}: {
  initialRows: OutboxRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<OutboxRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ query, category });
      const res = await fetch(`/api/admin/communication/outbox?${params}`);
      const data = await res.json();
      if (res.ok) setRows(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [query, category]);

  useEffect(() => {
    const timer = setTimeout(refresh, 300);
    return () => clearTimeout(timer);
  }, [refresh]);

  const filtered = rows.filter((r) => {
    if (category !== "all" && r.category !== category) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.recipientName.toLowerCase().includes(q) ||
      r.recipientEmail.toLowerCase().includes(q) ||
      (r.template_slug ?? "").toLowerCase().includes(q) ||
      (r.rendered_subject ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipient, template, subject…"
            className="pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          <option value="system">System</option>
          <option value="investment">Investment</option>
          <option value="support">Support</option>
          <option value="announcements">Announcements</option>
        </select>
        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={refresh}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-navy-400">
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Delivery</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const emailDelivery = row.communication_deliveries?.find((d) => d.channel === "email");
              return (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-900">{row.recipientName}</p>
                    <p className="text-xs text-navy-400">{row.recipientEmail}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.template_slug ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{row.status}</td>
                  <td className="px-4 py-3 capitalize">{emailDelivery?.status ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-navy-500">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 capitalize">{row.category}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setDetail(row)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" title="Resend">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" title="Duplicate">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-navy-900">Communication details</h3>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDetail(null)}>
              Close
            </Button>
          </div>
          <dl className="mt-4 grid gap-2 text-sm md:grid-cols-2">
            <div><dt className="text-navy-400">Subject</dt><dd>{detail.rendered_subject ?? "—"}</dd></div>
            <div><dt className="text-navy-400">Template</dt><dd className="font-mono">{detail.template_slug ?? "—"}</dd></div>
            <div><dt className="text-navy-400">Recipient</dt><dd>{detail.recipientName} ({detail.recipientEmail})</dd></div>
            <div><dt className="text-navy-400">Triggered by</dt><dd>{detail.triggered_by ?? "system"}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
