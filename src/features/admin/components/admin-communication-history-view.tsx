"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminCommunicationHistoryView() {
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/communication/history?limit=100");
      const data = await res.json();
      if (res.ok) setHistory(data.history ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={load}>
        <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
        Refresh
      </Button>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-navy-400">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Subject</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={String(row.id)} className="border-b border-border/60">
                <td className="px-4 py-3 text-xs text-navy-500">
                  {new Date(String(row.created_at)).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{String(row.template_slug ?? "—")}</td>
                <td className="px-4 py-3">{String(row.category)}</td>
                <td className="px-4 py-3">{String(row.status)}</td>
                <td className="px-4 py-3">{String(row.rendered_subject ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
