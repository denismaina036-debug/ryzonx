"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotificationHistoryRow } from "@/services/communication/communication-center.service";
import { cn } from "@/lib/utils";

export function AdminCommunicationNotificationsView() {
  const [notifications, setNotifications] = useState<NotificationHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/communication/notifications");
      const data = await res.json();
      if (res.ok) setNotifications(data.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-navy-500">Delivery history for email and in-app notifications.</p>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={load}>
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-navy-400">
              <th className="px-5 py-3">Recipient</th>
              <th className="px-5 py-3">Notification</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Channel</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-navy-500">
                  Loading notifications...
                </td>
              </tr>
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-navy-500">
                  No notifications yet.
                </td>
              </tr>
            ) : (
              notifications.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-5 py-3">
                    <p className="font-medium text-navy-900">{row.recipientName}</p>
                    <p className="text-xs text-navy-500">{row.recipientEmail}</p>
                  </td>
                  <td className="px-5 py-3">{row.notification}</td>
                  <td className="px-5 py-3">{row.type}</td>
                  <td className="px-5 py-3 capitalize">{row.channel.replace("_", " ")}</td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        row.status === "delivered" || row.status === "sent"
                          ? "bg-emerald-50 text-emerald-700"
                          : row.status === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-navy-50 text-navy-600"
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-navy-500">
                    {new Date(row.date).toLocaleString()}
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
