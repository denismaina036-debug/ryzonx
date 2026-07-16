"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SupportTicket } from "@/features/investor/types/account";

export function AdminSupportInbox({ tickets }: { tickets: SupportTicket[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const selected = tickets.find((t) => t.id === selectedId);

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/support/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Reply failed");
      toast.success("Reply sent");
      setReply("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="rounded-lg border bg-white">
        <ul className="divide-y">
          {tickets.length === 0 && (
            <li className="p-4 text-sm text-navy-500">No support tickets yet.</li>
          )}
          {tickets.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "w-full px-4 py-3 text-left hover:bg-navy-50",
                  selectedId === t.id && "bg-royal-50"
                )}
              >
                <p className="truncate text-sm font-medium text-navy-950">{t.subject}</p>
                <p className="text-xs text-navy-500">{t.investorName}</p>
                <p className="text-xs capitalize text-navy-400">{t.status}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border bg-white p-4">
        {!selected ? (
          <p className="text-sm text-navy-500">Select a ticket.</p>
        ) : (
          <>
            <div className="mb-4 border-b pb-3">
              <h3 className="font-semibold text-navy-950">{selected.subject}</h3>
              <p className="text-sm text-navy-500">
                {selected.investorName} · {selected.investorEmail}
              </p>
            </div>
            <div className="max-h-[400px] space-y-3 overflow-y-auto">
              {selected.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    m.isAdmin ? "ml-10 bg-royal-50 text-navy-800" : "mr-10 bg-navy-50"
                  )}
                >
                  <p className="mb-1 text-xs font-medium text-navy-500">{m.senderName}</p>
                  <p>{m.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply…"
              />
              <Button disabled={sending} onClick={sendReply}>
                Reply
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
