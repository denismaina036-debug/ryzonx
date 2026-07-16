import Link from "next/link";
import { ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { ROUTES } from "@/constants/routes";
import { fundService } from "@/services/fund.service";
import { formatPercentage } from "@/lib/utils";
import type { Trade } from "@/types";

function TradeDirectionBadge({ direction }: { direction: Trade["direction"] }) {
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

export async function JournalPreviewSection() {
  const trades = await fundService.getRecentTrades(undefined, 5);

  return (
    <SectionContainer>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          badge="Trading Journal"
          title="Latest Published Trades"
          description="Every trade is verified and published for full transparency."
          className="mb-0"
        />
        <Button asChild variant="outline">
          <Link href={ROUTES.journal}>
            View Full Journal
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Entry</TableHead>
              <TableHead>Exit</TableHead>
              <TableHead>ROI</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell className="font-medium text-navy-950">
                  {trade.symbol}
                </TableCell>
                <TableCell>
                  <TradeDirectionBadge direction={trade.direction} />
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {trade.entryPrice.toLocaleString()}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {trade.exitPrice?.toLocaleString() ?? "—"}
                </TableCell>
                <TableCell
                  className={
                    (trade.pnlPercentage ?? 0) >= 0
                      ? "font-mono text-sm font-medium text-emerald-600"
                      : "font-mono text-sm font-medium text-red-600"
                  }
                >
                  {trade.pnlPercentage != null
                    ? formatPercentage(trade.pnlPercentage)
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      trade.status === "closed" ? "default" : "secondary"
                    }
                  >
                    {trade.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-navy-500">
                  {trade.closedAt
                    ? new Date(trade.closedAt).toLocaleDateString()
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionContainer>
  );
}
