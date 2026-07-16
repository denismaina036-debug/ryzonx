"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionStatusBadge } from "@/features/admin/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { AdminTransaction } from "@/features/admin/types";

export function TransactionsTable({ transactions }: { transactions: AdminTransaction[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Investor</TableHead>
          <TableHead>Fund</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-mono text-xs">{t.id}</TableCell>
            <TableCell>{t.investorName}</TableCell>
            <TableCell>{t.fundName}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">{t.type}</Badge>
            </TableCell>
            <TableCell className="font-mono">{formatCurrency(t.amount)}</TableCell>
            <TableCell><TransactionStatusBadge status={t.status} /></TableCell>
            <TableCell className="text-xs text-navy-500">
              {new Date(t.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
