import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ROUTES } from "@/constants/routes";
import type { PublicJournalTrade } from "@/domain/trading-journal/types";
import { formatCurrency } from "@/lib/utils";

export function JournalTradeDirectionBadge({
  direction,
}: {
  direction: PublicJournalTrade["direction"];
}) {
  return (
    <Badge variant={direction === "long" ? "success" : "warning"}>
      {direction === "long" ? (
        <ArrowUpRight className="mr-1 h-3 w-3" />
      ) : (
        <ArrowDownRight className="mr-1 h-3 w-3" />
      )}
      {direction.toUpperCase()}
    </Badge>
  );
}

function formatJournalPnl(pnl: number | null): string {
  if (pnl == null) return "—";
  const sign = pnl >= 0 ? "+" : "−";
  return `${sign}${formatCurrency(Math.abs(pnl))}`;
}

export function JournalTradeTableRow({
  trade,
  variant = "preview",
}: {
  trade: PublicJournalTrade;
  variant?: "preview" | "full";
}) {
  const pnl = trade.realizedPnl ?? 0;
  const pnlTone =
    trade.realizedPnl == null
      ? "font-mono text-sm font-medium text-navy-500"
      : pnl >= 0
        ? "font-mono text-sm font-medium text-emerald-600"
        : "font-mono text-sm font-medium text-red-600";

  return (
    <TableRow>
      <TableCell className="font-medium text-navy-950">{trade.symbol}</TableCell>
      <TableCell>
        {trade.poolManagerSlug ? (
          <Link
            href={`${ROUTES.managers}/${trade.poolManagerSlug}`}
            className="text-sm font-medium text-navy-700 hover:text-royal-600 hover:underline"
          >
            {trade.poolManagerName}
          </Link>
        ) : (
          <span className="text-sm text-navy-700">{trade.poolManagerName}</span>
        )}
      </TableCell>
      {variant === "full" && (
        <>
          <TableCell className="text-sm text-navy-600">{trade.poolName}</TableCell>
          <TableCell className="text-sm text-navy-500">{trade.cycleName}</TableCell>
        </>
      )}
      <TableCell>
        <JournalTradeDirectionBadge direction={trade.direction} />
      </TableCell>
      <TableCell className={pnlTone}>{formatJournalPnl(trade.realizedPnl)}</TableCell>
      {variant === "full" && (
        <>
          <TableCell className="text-sm text-navy-500">
            {new Date(trade.openedAt).toLocaleDateString()}
          </TableCell>
          <TableCell className="text-sm text-navy-500">
            {trade.closedAt ? new Date(trade.closedAt).toLocaleDateString() : "—"}
          </TableCell>
        </>
      )}
      {variant === "preview" && (
        <>
          <TableCell>
            <Badge variant="default">closed</Badge>
          </TableCell>
          <TableCell className="text-sm text-navy-500">
            {trade.closedAt ? new Date(trade.closedAt).toLocaleDateString() : "—"}
          </TableCell>
        </>
      )}
      {variant === "full" && (
        <TableCell>
          <Badge variant="default">{trade.status}</Badge>
        </TableCell>
      )}
    </TableRow>
  );
}

export function JournalTradesEmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-navy-200 bg-navy-50/50 px-6 py-10 text-center text-sm text-navy-600">
      {message}
    </p>
  );
}
