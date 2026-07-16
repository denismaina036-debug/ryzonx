"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditLogEntry } from "@/features/admin/types";

export function AuditLogsTable({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Summary</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="text-xs text-navy-500 whitespace-nowrap">
              {new Date(log.createdAt).toLocaleString()}
            </TableCell>
            <TableCell>{log.actorName}</TableCell>
            <TableCell className="font-mono text-xs">{log.action}</TableCell>
            <TableCell className="text-xs capitalize">{log.entityType}</TableCell>
            <TableCell className="max-w-md truncate text-sm">{log.summary}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
