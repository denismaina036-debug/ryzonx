"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { TRADE_ENTRY_RESULT_LABELS } from "@/constants/trade-entry";
import type { PublicPoolTradeView } from "@/domain/trading-journal/types";
import {
  formatTradeDirectionLabel,
  formatTradeDirectionSubtle,
  hasScreenshot,
} from "@/lib/trading/trade-display";
import { formatCurrency } from "@/lib/utils";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";

interface PoolActivityTradeDetailDialogProps {
  trade: PublicPoolTradeView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PoolActivityTradeDetailDialog({
  trade,
  open,
  onOpenChange,
}: PoolActivityTradeDetailDialogProps) {
  if (!trade) return null;

  const closedDate = trade.closedAt ? new Date(trade.closedAt) : null;
  const pnl = trade.realizedPnl ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{trade.instrument}</DialogTitle>
        </DialogHeader>

        <dl className="grid gap-4 text-sm">
          <DetailRow label="Trade ID" value={trade.tradeReference} mono />
          <DetailRow label="Asset" value={trade.instrument} />
          <DetailRow
            label="Direction"
            value={`${formatTradeDirectionLabel(trade.direction)} (${formatTradeDirectionSubtle(trade.direction)})`}
          />
          <DetailRow
            label="Profit / Loss"
            value={
              trade.tradeResult
                ? TRADE_ENTRY_RESULT_LABELS[trade.tradeResult]
                : pnl >= 0
                  ? "Profit"
                  : "Loss"
            }
          />
          <DetailRow
            label="Amount"
            value={
              trade.realizedPnl != null
                ? `${pnl >= 0 ? "+" : "−"}${formatCurrency(Math.abs(pnl))}`
                : "—"
            }
          />
          {closedDate && (
            <>
              <DetailRow
                label="Date"
                value={closedDate.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              />
              <DetailRow
                label="Time"
                value={closedDate.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              />
            </>
          )}
          <DetailRow
            label="Trading Cycle"
            value={`${trade.cycleName} · ${
              INVESTMENT_CYCLE_STATUS_LABELS[trade.cycleStatus as InvestmentCycleStatus] ??
              trade.cycleStatus
            }`}
          />
        </dl>

        {hasScreenshot(trade.screenshotUrl) && (
          <div className="mt-2 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
              Screenshot
            </p>
            <div className="overflow-hidden rounded-lg border border-[var(--id-border)] bg-[var(--id-bg)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trade.screenshotUrl!}
                alt={`${trade.instrument} trade screenshot`}
                className="max-h-[50vh] w-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-[var(--id-text-muted)]">{label}</dt>
      <dd
        className={
          mono
            ? "break-all font-mono text-xs text-[var(--id-text)] sm:text-right"
            : "font-medium text-[var(--id-text)] sm:text-right"
        }
      >
        {value}
      </dd>
    </div>
  );
}
