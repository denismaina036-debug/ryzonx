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
import type { AdminTestimonial } from "@/features/admin/types";

export function TestimonialsTable({ testimonials }: { testimonials: AdminTestimonial[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Return</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {testimonials.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">{t.name}</TableCell>
            <TableCell>{t.role}</TableCell>
            <TableCell>{t.rating}/5</TableCell>
            <TableCell>{t.returnRate != null ? `${t.returnRate}%` : "—"}</TableCell>
            <TableCell><PublishedBadge published={t.isPublished} /></TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="outline">Edit</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
