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
import { PublishedBadge } from "@/features/admin/components/status-badge";
import type { FaqItem } from "@/types";

export function FaqTable({ items }: { items: FaqItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Question</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.sortOrder}</TableCell>
            <TableCell className="max-w-md font-medium">{item.question}</TableCell>
            <TableCell><PublishedBadge published={item.isPublished} /></TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="outline">Edit</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
