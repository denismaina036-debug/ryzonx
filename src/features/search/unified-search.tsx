"use client";
import { copyTradingText } from "@/lib/copy-trading-presentation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/providers/auth-provider";
import { tradingFetch } from "@/features/trading/queries";
import type { SearchResult } from "@/domain/search/unified-search";

export function UnifiedSearch() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const { user } = useAuth();
  useEffect(() => { const timer = setTimeout(() => setQuery(input.trim()), 250); return () => clearTimeout(timer); }, [input]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(value => !value); } };
    window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const result = useQuery({ queryKey: ["unified-search", user?.id, query], queryFn: () => tradingFetch<{ results: SearchResult[]; partial: boolean }>(`/api/search?q=${encodeURIComponent(query)}`), enabled: open && query.length >= 2 && !!user, staleTime: 15_000, retry: 0 });
  const waiting = input.trim() !== query || result.isFetching;
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Search markets, traders, or anything" className="flex h-10 min-w-0 items-center gap-2 rounded-full border border-[var(--id-border)] bg-[var(--id-surface-muted)] px-3 text-sm text-[var(--id-text-muted)] md:w-full md:px-4">
      <Search size={17} className="shrink-0" /><span className="hidden truncate md:block">Search markets, traders, or anything…</span><kbd className="ml-auto hidden text-xs lg:block">⌘K</kbd>
    </button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogTitle>Search RyvonX</DialogTitle><DialogDescription>Markets, copy-trading strategies and verified traders.</DialogDescription>
      <input aria-label="Search markets, strategies and traders" type="search" value={input} onChange={event => setInput(event.target.value)} placeholder="Search markets, traders, or anything…" maxLength={80} className="mt-5 w-full rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] p-3 text-[var(--id-text)] outline-none focus:ring-2 focus:ring-blue-500" />
      <div className="mt-4 max-h-[50dvh] overflow-y-auto" aria-live="polite">
        {query.length < 2 ? <p className="text-sm text-[var(--id-text-muted)]">Enter at least two characters.</p> : waiting ? <p className="text-sm text-[var(--id-text-muted)]">Searching…</p> : result.isError ? <p role="alert">Search is temporarily unavailable.</p> : <>
          {(["markets", "pools", "managers"] as const).map(kind => {
            const items = result.data?.results.filter(item => item.kind === kind) ?? [];
            return items.length ? <section key={kind} className="mb-5"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">{kind === "managers" ? "Verified traders" : kind === "pools" ? "Copy strategies" : "Markets"}</h3>{items.map(item => <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-[var(--id-surface-hover)] focus-visible:ring-2 focus-visible:ring-blue-500"><span className="block text-sm font-medium text-[var(--id-text)]">{copyTradingText(item.label)}</span><span className="text-xs text-[var(--id-text-muted)]">{copyTradingText(item.detail)}</span></Link>)}</section> : null;
          })}
          {!result.data?.results.length && <p className="text-sm text-[var(--id-text-muted)]">No results found.</p>}
          {result.data?.partial && <p className="text-xs text-[var(--id-text-muted)]">Some search sources are temporarily unavailable.</p>}
        </>}
      </div>
      <Link href="/marketplace" onClick={() => setOpen(false)} className="mt-4 text-sm text-blue-500">Browse existing strategies and traders →</Link>
    </DialogContent></Dialog>
  </>;
}
