"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupportTicket } from "@/features/investor/types/account";

export function useSupportUnread() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const currentUser = useRef<string | null>(null);
  const seenRef = useRef<string[]>([]);

  useEffect(() => {
    const client = createClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((_, session) => {
      const id = session?.user.id ?? null;
      if (currentUser.current === id) return;
      currentUser.current = id;
      setUserId(id); setTickets([]);
      let saved: string[] = [];
      try {
        const parsed: unknown = id ? JSON.parse(localStorage.getItem(`ryvonx:support-seen:${id}`) ?? "[]") : [];
        if (Array.isArray(parsed)) saved = parsed.filter((value): value is string => typeof value === "string");
      } catch { /* Storage may be unavailable; keep read state for this visit. */ }
      seenRef.current = saved; setSeen(saved);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      try {
        if (document.visibilityState !== "visible") return;
        const response = await fetch("/api/investor/support", {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        if (!response.ok) return;
        const payload = await response.json() as { tickets: SupportTicket[] };
        if (!stopped && currentUser.current === userId) setTickets(payload.tickets);
      } catch { /* Keep the last known count during temporary connection failures. */ }
      finally { if (!stopped) timer = setTimeout(refresh, 15000); }
    }
    void refresh();
    function syncRead(event: StorageEvent) {
      if (event.key !== `ryvonx:support-seen:${userId}`) return;
      try {
        const value: unknown = JSON.parse(event.newValue ?? "[]");
        if (Array.isArray(value)) {
          const ids = value.filter((id): id is string => typeof id === "string");
          seenRef.current = ids; setSeen(ids);
        }
      } catch { /* Ignore invalid storage data. */ }
    }
    window.addEventListener("storage", syncRead);
    return () => { stopped = true; controller.abort(); clearTimeout(timer); window.removeEventListener("storage", syncRead); };
  }, [userId]);

  const markViewed = useCallback((ticket: SupportTicket) => {
    if (!userId || currentUser.current !== userId || document.visibilityState !== "visible") return;
    const replies = ticket.messages.filter((message) => message.isAdmin).map((message) => message.id);
    const next = Array.from(new Set([...seenRef.current, ...replies]));
    if (next.length === seenRef.current.length) return;
    seenRef.current = next; setSeen(next);
    try { localStorage.setItem(`ryvonx:support-seen:${userId}`, JSON.stringify(next)); } catch { /* In-memory read tracking still works. */ }
  }, [userId]);

  const seenIds = new Set(seen);
  const unreadTickets = tickets.filter((ticket) => ticket.messages.some((message) => message.isAdmin && !seenIds.has(message.id)));
  const unreadCount = unreadTickets.reduce((count, ticket) => count + ticket.messages.filter((message) => message.isAdmin && !seenIds.has(message.id)).length, 0);
  return { unreadCount, unreadTickets, markViewed };
}
