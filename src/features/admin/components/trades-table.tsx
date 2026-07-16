"use client";

import { Fragment, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TradeStatusBadge, PublishedBadge } from "@/features/admin/components/status-badge";
import { TradeScreenshotField } from "@/features/admin/components/trade-screenshot-field";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { resolveTradeScreenshotUrl } from "@/lib/storage/trade-screenshots";
import type { AdminTrade } from "@/features/admin/types";

export function TradesTable({ trades }: { trades: AdminTrade[] }) {
  const [urls, setUrls] = useState<Record<string, string>>(() =>
    Object.fromEntries(trades.map((t) => [t.id, t.screenshotUrl ?? ""]))
  );
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  function toggleScreenshotRow(tradeId: string) {
    setExpandedId((current) => (current === tradeId ? null : tradeId));
  }

  async function saveScreenshot(tradeId: string) {
    setSaving(tradeId);
    try {
      const screenshotUrl = await resolveTradeScreenshotUrl({
        file: files[tradeId] ?? null,
        url: urls[tradeId] ?? "",
        tradeId,
      });

      const res = await fetch(`/api/admin/trades/${tradeId}/screenshot`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshotUrl: screenshotUrl ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");

      if (screenshotUrl) {
        setUrls((prev) => ({ ...prev, [tradeId]: screenshotUrl }));
      }
      setFiles((prev) => ({ ...prev, [tradeId]: null }));
      toast.success("Trade screenshot saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pool</TableHead>
          <TableHead>Asset</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead>Entry</TableHead>
          <TableHead>Exit</TableHead>
          <TableHead>ROI</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Published</TableHead>
          <TableHead>Screenshot</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((t) => {
          const hasScreenshot = !!(t.screenshotUrl || urls[t.id]?.trim() || files[t.id]);
          const isExpanded = expandedId === t.id;

          return (
            <Fragment key={t.id}>
              <TableRow>
                <TableCell className="text-sm text-navy-600">{t.fundName}</TableCell>
                <TableCell className="font-medium">{t.symbol}</TableCell>
                <TableCell className="capitalize">{t.direction}</TableCell>
                <TableCell className="font-mono text-sm">{formatCurrency(t.entryPrice)}</TableCell>
                <TableCell className="font-mono text-sm">
                  {t.exitPrice ? formatCurrency(t.exitPrice) : "—"}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {t.pnlPercentage != null ? formatPercentage(t.pnlPercentage) : "—"}
                </TableCell>
                <TableCell>
                  <TradeStatusBadge status={t.status} />
                </TableCell>
                <TableCell>
                  <PublishedBadge published={!!t.publishedAt} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant={isExpanded ? "default" : "outline"}
                      onClick={() => toggleScreenshotRow(t.id)}
                    >
                      {hasScreenshot ? "Edit screenshot" : "Add screenshot"}
                    </Button>
                    {hasScreenshot && !isExpanded ? (
                      <span className="text-xs text-emerald-600">Attached</span>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>

              {isExpanded ? (
                <TableRow>
                  <TableCell colSpan={9} className="bg-surface-1/50">
                    <div className="max-w-xl py-2">
                      <TradeScreenshotField
                        compact
                        url={urls[t.id] ?? ""}
                        onUrlChange={(value) =>
                          setUrls((prev) => ({ ...prev, [t.id]: value }))
                        }
                        file={files[t.id] ?? null}
                        onFileChange={(file) =>
                          setFiles((prev) => ({ ...prev, [t.id]: file }))
                        }
                        disabled={saving === t.id}
                      />
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          disabled={saving === t.id}
                          onClick={() => saveScreenshot(t.id)}
                        >
                          {saving === t.id ? "Saving…" : "Save screenshot"}
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
