"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Bell, Check, Loader2, Mail, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ADMIN_ANNOUNCEMENT_TEMPLATE_SLUG } from "@/constants/communication-center";
import type { CommunicationChannel } from "@/domain/communication/types";
import type { AdminUserSearchResult } from "@/services/communication/communication-center.service";
import { cn } from "@/lib/utils";

type Delivery = { id: string; channel: CommunicationChannel; status: string; error_message?: string | null };
type MessageRow = { id: string; rendered_subject?: string | null; created_at?: string; recipientName?: string; recipientEmail?: string; communication_deliveries?: Delivery[] };
type TelegramPreview = { text: string; parts: string[]; imageUrl: string | null; destination: string };
type MessagePreview = { emailHtml: string | null; emailSubject: string | null; inAppTitle: string | null; inAppBody: string | null; telegram: TelegramPreview | null };
const CHANNELS = [{ id: "email" as const, label: "Email" }, { id: "in_app" as const, label: "In-App" }, { id: "telegram" as const, label: "Telegram" }];

function emptyRichText(html: string) { return !html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim(); }
function channelLabel(channel: CommunicationChannel) { return channel === "in_app" ? "In-App" : channel === "telegram" ? "Telegram" : "Email"; }

export function AdminCommunicationMessagesView() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<MessagePreview | null>(null);
  const [audience, setAudience] = useState<"all" | "individual">("all");
  const [users, setUsers] = useState<AdminUserSearchResult[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<CommunicationChannel[]>(["email", "in_app"]);
  const [telegramConfig, setTelegramConfig] = useState<{ ready: boolean; chatId: string } | null>(null);
  const [heading, setHeading] = useState("");
  const [content, setContent] = useState("");
  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) ?? null, [users, selectedUserId]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/admin/communication/messages"); const data = await response.json(); if (response.ok) setMessages(data.messages ?? []); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadMessages(); }, [loadMessages]);
  useEffect(() => { void fetch("/api/admin/communication/settings/telegram").then((r) => r.json()).then((data) => setTelegramConfig(data.telegram ?? null)).catch(() => setTelegramConfig(null)); }, []);
  useEffect(() => {
    if (audience === "all") { setSelectedUserId(""); return; }
    setSelectedChannels((current) => current.filter((channel) => channel !== "telegram"));
    setLoadingUsers(true);
    void fetch("/api/admin/communication/messages/users?all=1").then((r) => r.json()).then((data) => setUsers(data.users ?? [])).finally(() => setLoadingUsers(false));
  }, [audience]);

  function toggleChannel(channel: CommunicationChannel) { setSelectedChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]); }
  async function retryTelegram(deliveryId: string) {
    const response = await fetch(`/api/admin/communication/deliveries/${deliveryId}/retry`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error ?? "Telegram retry failed");
    toast.success("Telegram delivery retried. Email and In-App were not resent.");
    await loadMessages();
  }

  async function handlePreview() {
    if (!heading.trim() || emptyRichText(content)) return toast.error("Enter a heading and content to preview.");
    if (selectedChannels.length === 0) return toast.error("Select at least one channel.");
    setPreviewing(true);
    try {
      const baseResponse = await fetch(`/api/admin/communication/templates/${ADMIN_ANNOUNCEMENT_TEMPLATE_SLUG}/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variables: { first_name: selectedUser?.fullName.split(/\s+/)[0] ?? "Naomi", fullName: selectedUser?.fullName ?? "Naomi Example", announcement_title: heading.trim(), announcement_body: content } }) });
      const base = await baseResponse.json();
      if (!baseResponse.ok) throw new Error(base.error ?? "Preview failed");
      let telegram: TelegramPreview | null = null;
      if (selectedChannels.includes("telegram")) {
        const response = await fetch("/api/admin/communication/telegram/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ heading: heading.trim(), content }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Telegram preview failed"); telegram = data.preview;
      }
      setPreview({ emailHtml: base.email?.html ?? base.rendered?.html ?? null, emailSubject: base.rendered?.subject ?? null, inAppTitle: base.rendered?.inAppTitle ?? null, inAppBody: base.rendered?.inAppBody ?? null, telegram });
      setPreviewOpen(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Preview failed"); }
    finally { setPreviewing(false); }
  }

  async function handleSend() {
    if (!heading.trim() || emptyRichText(content)) return toast.error("Heading and content are required.");
    if (audience === "individual" && !selectedUser) return toast.error("Select a recipient email.");
    if (selectedChannels.length === 0) return toast.error("Select at least one channel.");
    if (selectedChannels.includes("telegram") && !telegramConfig?.ready) return toast.error("Configure and enable Telegram in Communication Settings first.");
    const confirmation = ["Publish announcement?", `Audience: ${audience === "all" ? "All Users" : selectedUser?.email}`, `Channels: ${selectedChannels.map(channelLabel).join(", ")}`, ...(selectedChannels.includes("telegram") ? [`Telegram destination: ${telegramConfig?.chatId}`] : [])].join("\n\n");
    if (!window.confirm(confirmation)) return;
    setSending(true);
    try {
      const response = await fetch("/api/admin/communication/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audience, recipientUserId: selectedUser?.id, channels: selectedChannels, heading: heading.trim(), content, requestId: crypto.randomUUID() }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Send failed");
      const telegramSent = (data.channels ?? []).some((item: { channel: string; status: string }) => item.channel === "telegram" && item.status !== "failed");
      if (data.status === "sent") toast.success(`${selectedChannels.some((channel) => channel !== "telegram") ? `Sent to ${data.recipientCount} recipient(s).` : ""}${telegramSent ? " Telegram posted once." : ""}`.trim());
      else if (data.status === "partial") toast.warning(`Delivery partially completed. ${data.failed} failed; successful channels were not rolled back.`);
      else toast.error("Announcement delivery failed. See message history for channel status.");
      setComposerOpen(false); setSelectedUserId(""); setHeading(""); setContent(""); setPreview(null); setPreviewOpen(false); await loadMessages();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Send failed"); }
    finally { setSending(false); }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-navy-500">Write once and publish through independent RyvonX channels.</p><Button type="button" onClick={() => setComposerOpen((open) => !open)}><Plus className="mr-1.5 h-4 w-4" /> Send Message</Button></div>
    {composerOpen && <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div><h2 className="text-sm font-semibold text-navy-900">Publish announcement</h2><p className="mt-1 text-xs text-navy-500">Choose the audience and every channel where this update should appear.</p></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="space-y-5">
        <div><Label className="text-xs uppercase tracking-wide text-navy-400">Audience</Label><div className="mt-2 flex flex-wrap gap-2">{(["all", "individual"] as const).map((option) => <Button key={option} type="button" size="sm" variant={audience === option ? "default" : "outline"} onClick={() => setAudience(option)}>{option === "all" ? "All Users" : "Individual User"}</Button>)}</div></div>
        {audience === "individual" && <div className="space-y-2"><Label>Recipient</Label>{loadingUsers ? <div className="flex items-center gap-2 text-sm text-navy-500"><Loader2 className="h-4 w-4 animate-spin" />Loading users…</div> : <Select value={selectedUserId} onValueChange={setSelectedUserId}><SelectTrigger className="h-11"><SelectValue placeholder="Select a registered email" /></SelectTrigger><SelectContent className="max-h-72">{users.map((user) => <SelectItem key={user.id} value={user.id}>{user.email} — {user.fullName}</SelectItem>)}</SelectContent></Select>}</div>}
        <div><Label className="text-xs uppercase tracking-wide text-navy-400">Channels</Label><div className="mt-2 flex flex-wrap gap-2">{CHANNELS.map((channel) => { const selected = selectedChannels.includes(channel.id); const disabled = channel.id === "telegram" && (audience === "individual" || !telegramConfig?.ready); return <Button key={channel.id} type="button" size="sm" variant={selected ? "default" : "outline"} disabled={disabled} onClick={() => toggleChannel(channel.id)}>{selected && <Check className="mr-1.5 h-3.5 w-3.5" />}{channel.label}</Button>; })}<Button type="button" size="sm" variant="outline" disabled={audience === "individual" || !telegramConfig?.ready} onClick={() => setSelectedChannels(["email", "in_app", "telegram"])}>All Channels</Button></div>
          {audience === "individual" && <p className="mt-2 text-xs text-amber-700">Telegram channel publishing is available for general announcements only.</p>}{audience === "all" && telegramConfig && !telegramConfig.ready && <p className="mt-2 text-xs text-navy-500">Configure and enable Telegram in Communication Settings to use this channel.</p>}
        </div>
      </div><div className="space-y-4"><div><Label htmlFor="message-heading">Heading</Label><Input id="message-heading" className="mt-2" value={heading} onChange={(event) => setHeading(event.target.value)} placeholder="Announcement heading" /></div><div><Label>Content</Label><p className="mt-1 text-xs text-navy-500">Formatting, links, tables, and public image URLs are adapted for each channel.</p><RichTextEditor className="mt-2" value={content} onChange={setContent} placeholder="Write your announcement…" /></div></div></div>
      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setComposerOpen(false)}>Cancel</Button><Button type="button" variant="outline" disabled={previewing} onClick={handlePreview}>{previewing && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Preview</Button><Button type="button" disabled={sending} onClick={handleSend}>{sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}Publish</Button></div>
    </section>}
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}><DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto"><DialogHeader><DialogTitle>Announcement preview</DialogTitle><DialogDescription>Preview only—nothing is sent until you confirm Publish.</DialogDescription></DialogHeader><div className="grid gap-5 lg:grid-cols-2">
      {selectedChannels.includes("email") && <div className="space-y-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4" />Email</h3>{preview?.emailSubject && <p className="rounded-lg border p-2 text-sm">Subject: {preview.emailSubject}</p>}{preview?.emailHtml && <iframe title="Email preview" srcDoc={preview.emailHtml} className="h-[420px] w-full rounded-lg border bg-white" sandbox="" />}</div>}
      {selectedChannels.includes("in_app") && <div className="space-y-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4" />In-App</h3><div className="rounded-xl border bg-navy-50/30 p-4"><div className="mx-auto max-w-md rounded-xl border bg-white p-4 shadow-sm"><p className="font-semibold">{preview?.inAppTitle ?? heading}</p><p className="mt-2 whitespace-pre-wrap text-sm">{preview?.inAppBody}</p></div></div></div>}
      {selectedChannels.includes("telegram") && <div className="space-y-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><Send className="h-4 w-4 text-sky-500" />Telegram · {preview?.telegram?.destination}</h3><div className="rounded-xl border border-sky-200 bg-[#dceffc] p-3 sm:p-5"><div className="ml-auto max-w-md rounded-2xl rounded-br-sm bg-white p-4 shadow-sm">{preview?.telegram?.imageUrl && <Image unoptimized width={640} height={360} src={preview.telegram.imageUrl} alt="Telegram announcement" className="mb-3 max-h-56 w-full rounded-lg object-cover" />}<p className="whitespace-pre-wrap text-sm leading-relaxed">{preview?.telegram?.text}</p>{(preview?.telegram?.parts.length ?? 0) > 1 && <p className="mt-3 text-xs text-sky-700">Sent in {preview?.telegram?.parts.length} ordered messages.</p>}</div></div></div>}
    </div></DialogContent></Dialog>
    <section className="rounded-xl border border-border bg-card"><div className="border-b px-5 py-4"><h2 className="text-sm font-semibold">Message history</h2></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-navy-400"><th className="px-5 py-3">Recipient</th><th className="px-5 py-3">Heading</th><th className="px-5 py-3">Channels</th><th className="px-5 py-3">Date</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={4} className="px-5 py-8 text-center text-navy-500">Loading messages…</td></tr> : messages.length === 0 ? <tr><td colSpan={4} className="px-5 py-8 text-center text-navy-500">No announcements sent yet.</td></tr> : messages.map((message) => <tr key={message.id} className="border-b border-border/60"><td className="px-5 py-3"><p className="font-medium">{message.recipientName}</p><p className="text-xs text-navy-500">{message.recipientEmail}</p></td><td className="px-5 py-3">{message.rendered_subject ?? "—"}</td><td className="px-5 py-3"><div className="flex flex-wrap gap-1">{(message.communication_deliveries ?? []).map((delivery) => delivery.channel === "telegram" && delivery.status === "failed" ? <button type="button" key={delivery.id} title={delivery.error_message ?? "Retry Telegram"} onClick={() => void retryTelegram(delivery.id)} className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 hover:bg-red-100">Telegram · failed · Retry</button> : <span key={delivery.id} title={delivery.error_message ?? undefined} className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", ["sent", "delivered"].includes(delivery.status) ? "bg-emerald-50 text-emerald-700" : delivery.status === "failed" ? "bg-red-50 text-red-700" : "bg-navy-50 text-navy-600")}>{channelLabel(delivery.channel)} · {delivery.status}</span>)}</div></td><td className="px-5 py-3 text-xs text-navy-500">{message.created_at ? new Date(message.created_at).toLocaleString() : "—"}</td></tr>)}
    </tbody></table></div></section>
  </div>;
}
