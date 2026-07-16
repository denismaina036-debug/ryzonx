"use client";

import { Button } from "@/components/ui/button";
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
import type { AdminFund } from "@/features/admin/types";

export function FundsTable({ funds }: { funds: AdminFund[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fund</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Pool Value</TableHead>
          <TableHead>AUM</TableHead>
          <TableHead>Investors</TableHead>
          <TableHead>ROI</TableHead>
          <TableHead>Min Investment</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {funds.map((f) => (
          <TableRow key={f.id}>
            <TableCell>
              <div>
                <p className="font-medium text-navy-950">{f.name}</p>
                {f.isDefault && <Badge variant="secondary" className="mt-1">Default</Badge>}
              </div>
            </TableCell>
            <TableCell className="capitalize">{f.status}</TableCell>
            <TableCell className="font-mono">{formatCurrency(f.poolValue)}</TableCell>
            <TableCell className="font-mono">{formatCurrency(f.assetsUnderManagement)}</TableCell>
            <TableCell>{f.activeInvestors}</TableCell>
            <TableCell>{formatPercentage(f.currentRoi)}</TableCell>
            <TableCell className="font-mono">{formatCurrency(f.minInvestment)}</TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="outline">Edit</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
