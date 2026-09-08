"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SupportTicket } from "@/features/investor/types/account";
import { groupSupportConversations } from "./support-conversations";

export function AdminSupportInbox({ tickets }: { tickets: SupportTicket[] }) {
  const router = useRouter();
  const conversations = groupSupportConversations(tickets);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [displayName, setDisplayName] = useState(tickets[0]?.adminDisplayName ?? "Support");
  const [sending, setSending] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const messageList = useRef<HTMLDivElement>(null);
  const inbox = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const previousConversation = useRef<string | undefined>(undefined);

  const selected = conversations.find((t) => t.id === selectedId) ?? conversations[0];
  const lastMessageId = selected?.messages.at(-1)?.id;

  useEffect(() => {
    const list = messageList.current;
    if (!list) return;
    if (previousConversation.current !== selected?.id || followLatest.current) {
      list.scrollTop = list.scrollHeight;
      followLatest.current = true;
    }
    previousConversation.current = selected?.id;
  }, [selected?.id, lastMessageId, showConversation]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!sending && document.visibilityState === "visible") router.refresh();
    }, 15_000);
    return () => clearInterval(timer);
  }, [router, sending]);

  async function sendReply() {
    const senderLabel = displayName.trim();
    if (!selected || !reply.trim() || sending) return;
    if (!senderLabel) {
      toast.error("Enter a display name for this ticket.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/support/${selected.replyTicketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply, displayName: senderLabel }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Reply failed");
      toast.success("Reply sent");
      followLatest.current = true;
      setReply("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div ref={inbox} className="grid h-[min(700px,calc(100dvh-320px))] min-h-[380px] min-w-0 scroll-mt-20 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className={cn("min-h-0 overflow-y-auto overscroll-contain rounded-xl border bg-white", showConversation && "hidden lg:block")}>
        <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 text-sm font-semibold text-navy-950">Conversations</div>
        <ul className="divide-y">
          {tickets.length === 0 && (
            <li className="p-4 text-sm text-navy-500">No support tickets yet.</li>
          )}
          {conversations.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                disabled={sending}
                onClick={() => {
                  setSelectedId(t.id);
                  followLatest.current = true;
                  setShowConversation(true);
                  inbox.current?.scrollIntoView({ block: "nearest" });
                  setDisplayName(t.adminDisplayName ?? "Support");
                  setReply("");
                }}
                className={cn(
                  "w-full px-4 py-3 text-left hover:bg-navy-50",
                  selected?.id === t.id && "bg-royal-50"
                )}
              >
                <p className="truncate text-sm font-medium text-navy-950">{t.investorName || t.investorEmail || "Customer"}</p>
                <p className="truncate text-xs text-navy-500">{t.messages.at(-1)?.body || t.subject}</p>
                <p className="text-xs capitalize text-navy-400">{t.status}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-white", !showConversation && "hidden lg:flex")}>
        {!selected ? (
          <p className="text-sm text-navy-500">Select a conversation.</p>
        ) : (
          <>
            <div className="shrink-0 border-b bg-white p-4">
              <button type="button" onClick={() => setShowConversation(false)} className="mb-2 inline-flex items-center gap-2 text-sm text-royal-600 lg:hidden">
                <ArrowLeft className="h-4 w-4" /> Conversations
              </button>
              <h3 className="font-semibold text-navy-950">{selected.investorName || "Customer"}</h3>
              <p className="break-words text-sm text-navy-500">
                {selected.investorEmail}
              </p>
              <p className="mt-1 text-xs text-navy-500">Replies appear in the client’s chat. New messages refresh automatically.</p>
            </div>
            <div
              ref={messageList}
              role="log"
              aria-label="Conversation messages"
              aria-live="polite"
              onScroll={(event) => {
                const list = event.currentTarget;
                followLatest.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
              }}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50/70 p-4"
            >
              {selected.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "w-fit max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                    m.isAdmin ? "ml-auto rounded-br-sm bg-royal-50 text-navy-800" : "mr-auto rounded-bl-sm border border-slate-100 bg-white"
                  )}
                >
                  <p className="mb-1 text-xs font-medium text-navy-500">{m.senderName}</p>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void sendReply(); }} className="shrink-0 space-y-2 border-t bg-white p-3 sm:p-4">
              <Input
                aria-label="Name visible to client"
                disabled={sending}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Name visible to client (e.g. Chase)"
                maxLength={80}
              />
              <div className="flex items-end gap-2">
              <textarea
                className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-royal-400 focus:ring-2 focus:ring-royal-100"
                rows={2}
                aria-label="Reply to client"
                disabled={sending}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply…"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void sendReply();
                  }
                }}
              />
              <Button type="submit" aria-label="Send reply" disabled={sending || !reply.trim() || !displayName.trim()}>
                <Send className="h-4 w-4" /><span className="hidden sm:inline">Send</span>
              </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
