"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountStatusBadge } from "@/features/admin/components/status-badge";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { AdminInvestor } from "@/features/admin/types";

export function InvestorsTable({ investors }: { investors: AdminInvestor[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Investor</TableHead>
          <TableHead>Fund</TableHead>
          <TableHead>Invested</TableHead>
          <TableHead>Current Value</TableHead>
          <TableHead>Ownership</TableHead>
          <TableHead>ROI</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {investors.map((inv) => (
          <TableRow key={inv.profile.id}>
            <TableCell>
              <div>
                <p className="font-medium text-navy-950">{inv.profile.fullName}</p>
                <p className="text-xs text-navy-500">{inv.profile.email}</p>
              </div>
            </TableCell>
            <TableCell>{inv.fundName}</TableCell>
            <TableCell className="font-mono">{formatCurrency(inv.totalInvested)}</TableCell>
            <TableCell className="font-mono">{formatCurrency(inv.currentValue)}</TableCell>
            <TableCell>{inv.ownershipPercentage.toFixed(2)}%</TableCell>
            <TableCell className={inv.roi >= 0 ? "text-emerald-600" : "text-red-600"}>
              {formatPercentage(inv.roi)}
            </TableCell>
            <TableCell><AccountStatusBadge status={inv.accountStatus} /></TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="outline">View</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
