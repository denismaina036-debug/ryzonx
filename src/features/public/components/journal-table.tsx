"use client";

import { useState, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { PublicJournalTrade } from "@/domain/trading-journal/types";
import {
  JournalTradeTableRow,
  JournalTradesEmptyState,
} from "@/features/public/components/journal-trade-row";

const PAGE_SIZE = 10;

type SortKey =
  | "symbol"
  | "poolManagerName"
  | "poolName"
  | "realizedPnl"
  | "openedAt"
  | "closedAt";

export function JournalTable({ trades }: { trades: PublicJournalTrade[] }) {
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("closedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...trades];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.poolManagerName.toLowerCase().includes(q) ||
          t.poolName.toLowerCase().includes(q) ||
          t.cycleName.toLowerCase().includes(q)
      );
    }
    if (directionFilter !== "all") {
      result = result.filter((t) => t.direction === directionFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp =
        typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [trades, search, directionFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = useCallback(
    (col: SortKey) => {
      if (sortBy === col) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(col);
        setSortOrder("desc");
      }
    },
    [sortBy]
  );

  if (trades.length === 0) {
    return (
      <JournalTradesEmptyState message="No published pool cycle trades yet. Trades appear here when pool managers close and publish them." />
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            placeholder="Search asset, manager, pool, or cycle..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
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

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button type="button" onClick={() => toggleSort("symbol")}>
                  Asset {sortBy === "symbol" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("poolManagerName")}>
                  Pool Manager{" "}
                  {sortBy === "poolManagerName" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("poolName")}>
                  Pool {sortBy === "poolName" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
              </TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("realizedPnl")}>
                  Profit / Loss{" "}
                  {sortBy === "realizedPnl" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("openedAt")}>
                  Open Date {sortBy === "openedAt" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("closedAt")}>
                  Close Date {sortBy === "closedAt" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="p-8 text-center text-sm text-navy-500">
                  No trades match your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((trade) => (
                <JournalTradeTableRow key={trade.id} trade={trade} variant="full" />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-navy-500">
            Page {page} of {totalPages}
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
