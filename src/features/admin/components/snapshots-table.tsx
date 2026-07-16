"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { DailyFundSnapshot } from "@/features/admin/types";

export function SnapshotsTable({ snapshots }: { snapshots: DailyFundSnapshot[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Opening</TableHead>
          <TableHead>Closing</TableHead>
          <TableHead>Daily ROI</TableHead>
          <TableHead>P/L</TableHead>
          <TableHead>Trades</TableHead>
          <TableHead>Win Rate</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {snapshots.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.date}</TableCell>
            <TableCell className="font-mono text-sm">{formatCurrency(s.openingPoolValue)}</TableCell>
            <TableCell className="font-mono text-sm">{formatCurrency(s.closingPoolValue)}</TableCell>
            <TableCell>{formatPercentage(s.dailyRoi)}</TableCell>
            <TableCell className={s.dailyProfitLoss >= 0 ? "text-emerald-600" : "text-red-600"}>
              {formatCurrency(s.dailyProfitLoss)}
            </TableCell>
            <TableCell>{s.tradesCount}</TableCell>
            <TableCell>{s.winRate}%</TableCell>
            <TableCell>
              {s.isLocked ? (
                <Badge variant="success">Locked</Badge>
              ) : (
                <Badge variant="warning">Open</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
