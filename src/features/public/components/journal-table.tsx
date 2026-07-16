"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatPercentage } from "@/lib/utils";
import { mockTrades } from "@/lib/mock-data";
import type { Trade } from "@/types";

const PAGE_SIZE = 10;

export function JournalTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [sortBy, setSortBy] = useState<keyof Trade>("closedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...mockTrades];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.symbol.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (directionFilter !== "all") {
      result = result.filter((t) => t.direction === directionFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, {
        numeric: true,
      });
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [search, statusFilter, directionFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = useCallback(
    (col: keyof Trade) => {
      if (sortBy === col) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(col);
        setSortOrder("desc");
      }
    },
    [sortBy]
  );

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            placeholder="Search by asset..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-input bg-background px-4 text-sm text-navy-700"
        >
          <option value="all">All Status</option>
          <option value="closed">Closed</option>
          <option value="open">Open</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={directionFilter}
          onChange={(e) => {
            setDirectionFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-input bg-background px-4 text-sm text-navy-700"
        >
          <option value="all">All Directions</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button type="button" onClick={() => toggleSort("symbol")}>
                Asset {sortBy === "symbol" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
            </TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>
              <button type="button" onClick={() => toggleSort("entryPrice")}>
                Entry {sortBy === "entryPrice" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
            </TableHead>
            <TableHead>Exit</TableHead>
            <TableHead>
              <button type="button" onClick={() => toggleSort("pnlPercentage")}>
                ROI {sortBy === "pnlPercentage" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
            </TableHead>
            <TableHead>Open Date</TableHead>
            <TableHead>
              <button type="button" onClick={() => toggleSort("closedAt")}>
                Close Date {sortBy === "closedAt" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
            </TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((trade) => (
            <TableRow key={trade.id}>
              <TableCell className="font-medium text-navy-950">
                {trade.symbol}
              </TableCell>
              <TableCell>
                <Badge variant={trade.direction === "long" ? "success" : "warning"}>
                  {trade.direction === "long" ? (
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3" />
                  )}
                  {trade.direction.toUpperCase()}
                </Badge>
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
              <TableCell className="text-sm text-navy-500">
                {new Date(trade.openedAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-sm text-navy-500">
                {trade.closedAt
                  ? new Date(trade.closedAt).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={trade.status === "closed" ? "default" : "secondary"}>
                  {trade.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-navy-500">
            Page {page} of {totalPages} ({filtered.length} trades)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
