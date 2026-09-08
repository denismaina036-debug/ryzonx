"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Headset, MessageCircle, MessageSquare, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { SupportTicket } from "@/features/investor/types/account";
import styles from "./whatsapp-support.module.css";

export function SupportLauncher({ whatsappUrl }: { whatsappUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setChat(false); }}>
      <DialogTrigger asChild>
        <button type="button" className={styles.button} aria-label="Open RyvonX support">
          <Headset size={27} strokeWidth={1.6} aria-hidden="true" />
          <span className={styles.label} aria-hidden="true">How can we help?</span>
        </button>
      </DialogTrigger>
      <DialogContent className={styles.panel}>
        <div className={styles.heading}>
          {chat ? <button type="button" className={styles.back} onClick={() => setChat(false)} aria-label="Back to support options"><ArrowLeft size={18} /></button> : <span className={styles.emblem}><Headset size={25} strokeWidth={1.5} /></span>}
          <span className={styles.eyebrow}>RYVONX SUPPORT</span>
          <DialogTitle className={styles.title}>{chat ? "Live chat" : "A little help. A clear next step."}</DialogTitle>
          <DialogDescription className={styles.description}>{chat ? "Message our team. Replies appear here when available." : "Choose how you’d like to get in touch."}</DialogDescription>
        </div>
        {chat ? <SupportChat /> : <div className={styles.options}>
          <button type="button" className={styles.option} onClick={() => setChat(true)}>
            <span className={styles.optionIcon}><MessageSquare size={22} strokeWidth={1.6} /></span>
            <span><strong>Live chat</strong><small>Chat with us in your account</small></span><ArrowUpRight size={18} />
          </button>
          {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.option}>
            <span className={`${styles.optionIcon} ${styles.whatsapp}`}><MessageCircle size={22} strokeWidth={1.6} /></span>
            <span><strong>WhatsApp</strong><small>Continue in WhatsApp · opens a new tab</small></span><ArrowUpRight size={18} />
          </a>}
          <p className={styles.note}>Personal support, wherever you are.</p>
        </div>}
      </DialogContent>
    </Dialog>
  );
}

function SupportChat() {
  const [auth, setAuth] = useState<"loading" | "guest" | "ready" | "error">("loading");
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const activeTicket = useRef<string | null>(null);
  const loadVersion = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (active) setAuth(data.user ? "ready" : error && error.name !== "AuthSessionMissingError" ? "error" : "guest");
    }).catch(() => { if (active) setAuth("error"); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session && active) { setTicket(null); setLoaded(false); activeTicket.current = null; setAuth("guest"); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (auth !== "ready") return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      const version = loadVersion.current;
      try {
        if (document.visibilityState === "hidden") return;
        const response = await fetch("/api/investor/support", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        if (!response.ok) throw new Error("Couldn’t load the conversation. Please try again shortly.");
        const data = await response.json() as { tickets: SupportTicket[] };
        if (!stopped && version === loadVersion.current) {
          const current = activeTicket.current ? data.tickets.find((item) => item.id === activeTicket.current) : data.tickets.find((item) => item.status !== "closed");
          activeTicket.current = current?.id ?? null;
          setTicket(current ?? null); setLoaded(true); setError("");
        }
      } catch (err) {
        if (!stopped) setError(err instanceof Error ? err.message : "Connection interrupted. Retrying shortly.");
      } finally { if (!stopped) timer = setTimeout(refresh, 15000); }
    }
    void refresh();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, [auth]);

  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [ticket?.messages.length]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim() || sending || !loaded) return;
    setSending(true); setError(""); loadVersion.current += 1;
    try {
      const response = await fetch(ticket ? `/api/investor/support/${ticket.id}` : "/api/investor/support", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "Live chat", message: message.trim() }),
      });
      if (!response.ok) throw new Error("Message could not be sent. Your draft is saved here; please try again.");
      if (!ticket) {
        const created = await response.json() as SupportTicket;
        activeTicket.current = created.id; setTicket(created);
      } else {
        setTicket({ ...ticket, messages: [...ticket.messages, { id: `sent-${Date.now()}`, ticketId: ticket.id, senderId: "self", senderName: "You", body: message.trim(), isAdmin: false, createdAt: new Date().toISOString() }] });
      }
      setMessage("");
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t send your message."); }
    finally { loadVersion.current += 1; setSending(false); }
  }

  if (auth === "loading") return <p className={styles.note} role="status">Connecting to your account…</p>;
  if (auth === "error") return <p className={styles.note} role="alert">We couldn’t connect to your account. Reopen chat to try again, or choose WhatsApp.</p>;
  if (auth === "guest") return <div className={styles.options}>
    <p className={styles.description}>Sign in to start a private conversation and keep your replies together. For help signing in, choose WhatsApp.</p>
    <Button asChild className="mt-5 w-full rounded-full"><Link href="/login?redirect=%2Fdashboard%2Fsupport">Sign in to chat</Link></Button>
  </div>;
  return <div className={styles.chat}>
    <div className={styles.messages} role="log" aria-label="Support messages" aria-live="polite">
      {!loaded && !error && <p className={styles.note}>Loading your conversation…</p>}
      {loaded && !ticket && <p className={styles.note}>How can we help you today? Send a message to start a conversation.</p>}
      {ticket?.messages.map((item) => <div key={item.id} className={item.isAdmin ? styles.received : styles.sent}><small>{item.isAdmin ? item.senderName : "You"}</small><p>{item.body}</p></div>)}
      <div ref={end} />
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <form onSubmit={send} className={styles.composer}>
      <label htmlFor="support-message" className="sr-only">Your message</label>
      <textarea id="support-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write your message…" rows={2} maxLength={5000} disabled={sending || !loaded} />
      <Button type="submit" size="icon" aria-label="Send message" disabled={!message.trim() || !loaded} isLoading={sending}><Send size={18} /></Button>
    </form>
    <p className={styles.note}>Replies refresh automatically. Response times may vary.</p>
  </div>;
}
