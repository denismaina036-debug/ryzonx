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
import type { AdminAnnouncement } from "@/features/admin/types";

export function AnnouncementsTable({ announcements }: { announcements: AdminAnnouncement[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Fund</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {announcements.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="font-medium">{a.title}</TableCell>
            <TableCell>{a.fundName}</TableCell>
            <TableCell><PublishedBadge published={a.isPublished} /></TableCell>
            <TableCell className="text-xs text-navy-500">
              {new Date(a.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="outline">Edit</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
