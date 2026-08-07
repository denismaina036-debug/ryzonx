"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { Bell, Loader2, Mail, Plus, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { RichTextEditor } from "@/components/ui/rich-text-editor";

import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogHeader,

  DialogTitle,

} from "@/components/ui/dialog";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import { ADMIN_ANNOUNCEMENT_TEMPLATE_SLUG } from "@/constants/communication-center";

import type { CommunicationChannel } from "@/domain/communication/types";

import type { AdminUserSearchResult } from "@/services/communication/communication-center.service";

import { cn } from "@/lib/utils";



type MessageRow = {

  id: string;

  template_slug?: string | null;

  rendered_subject?: string | null;

  status?: string;

  created_at?: string;

  recipientName?: string;

  recipientEmail?: string;

};



type ChannelMode = "email" | "in_app" | "both";



type MessagePreview = {

  emailHtml: string | null;

  emailSubject: string | null;

  inAppTitle: string | null;

  inAppBody: string | null;

};



function firstNameFromFullName(fullName: string): string {
  return fullName.trim().split(/\s+/).filter(Boolean)[0] ?? "there";
}

function isRichTextEmpty(html: string): boolean {
  return !html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

function channelModeToChannels(mode: ChannelMode): CommunicationChannel[] {

  if (mode === "email") return ["email"];

  if (mode === "in_app") return ["in_app"];

  return ["email", "in_app"];

}



function parsePreviewResponse(data: Record<string, unknown>): MessagePreview {

  const rendered = (data.rendered ?? {}) as Record<string, unknown>;

  const email = (data.email ?? {}) as Record<string, unknown>;



  return {

    emailHtml:

      (email.html as string | undefined) ??

      (rendered.html as string | undefined) ??

      null,

    emailSubject: (rendered.subject as string | undefined) ?? null,

    inAppTitle: (rendered.inAppTitle as string | undefined) ?? null,

    inAppBody: (rendered.inAppBody as string | undefined) ?? null,

  };

}



export function AdminCommunicationMessagesView() {

  const [messages, setMessages] = useState<MessageRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [composerOpen, setComposerOpen] = useState(false);

  const [sending, setSending] = useState(false);

  const [previewing, setPreviewing] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);

  const [preview, setPreview] = useState<MessagePreview | null>(null);



  const [audience, setAudience] = useState<"all" | "individual">("all");

  const [recipientUsers, setRecipientUsers] = useState<AdminUserSearchResult[]>([]);

  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [channelMode, setChannelMode] = useState<ChannelMode>("both");

  const [heading, setHeading] = useState("");

  const [content, setContent] = useState("");



  const selectedUser = useMemo(

    () => recipientUsers.find((user) => user.id === selectedUserId) ?? null,

    [recipientUsers, selectedUserId]

  );



  const loadMessages = useCallback(async () => {

    setLoading(true);

    try {

      const res = await fetch("/api/admin/communication/messages");

      const data = await res.json();

      if (res.ok) setMessages(data.messages ?? []);

    } finally {

      setLoading(false);

    }

  }, []);



  const loadRecipients = useCallback(async () => {

    setLoadingRecipients(true);

    try {

      const res = await fetch("/api/admin/communication/messages/users?all=1");

      const data = await res.json();

      if (res.ok) setRecipientUsers(data.users ?? []);

      else toast.error(data.error ?? "Could not load users.");

    } finally {

      setLoadingRecipients(false);

    }

  }, []);



  useEffect(() => {

    void loadMessages();

  }, [loadMessages]);



  useEffect(() => {

    if (audience !== "individual") {

      setSelectedUserId("");

      return;

    }

    void loadRecipients();

  }, [audience, loadRecipients]);



  async function handlePreview() {

    if (!heading.trim() || isRichTextEmpty(content)) {

      toast.error("Enter a heading and content to preview.");

      return;

    }

    setPreviewing(true);

    try {

      const res = await fetch(

        `/api/admin/communication/templates/${ADMIN_ANNOUNCEMENT_TEMPLATE_SLUG}/preview`,

        {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({
            variables: {
              first_name: selectedUser
                ? firstNameFromFullName(selectedUser.fullName)
                : "Naomi",
              fullName: selectedUser?.fullName ?? "Naomi Example",
              announcement_title: heading.trim(),
              announcement_body: content,
            },
          }),

        }

      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Preview failed");



      const parsed = parsePreviewResponse(data as Record<string, unknown>);

      if (!parsed.emailHtml && !parsed.inAppBody) {

        throw new Error("Preview did not return any content.");

      }



      setPreview(parsed);

      setPreviewOpen(true);

    } catch (error) {

      toast.error(error instanceof Error ? error.message : "Preview failed");

    } finally {

      setPreviewing(false);

    }

  }



  async function handleSend() {

    if (!heading.trim() || isRichTextEmpty(content)) {

      toast.error("Heading and content are required.");

      return;

    }

    if (audience === "individual" && !selectedUser) {

      toast.error("Select a recipient email.");

      return;

    }



    setSending(true);

    try {

      const res = await fetch("/api/admin/communication/messages", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          audience,

          recipientUserId: selectedUser?.id,

          channels: channelModeToChannels(channelMode),

          heading: heading.trim(),

          content,

        }),

      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Send failed");



      if (data.status === "sent") {

        toast.success(`Sent to ${data.recipientCount} recipient(s).`);

      } else if (data.status === "partial") {

        toast.warning(`Sent ${data.sent} of ${data.recipientCount}. ${data.failed} failed.`);

      } else {

        toast.error(`Failed to send to ${data.recipientCount} recipient(s).`);

      }



      setComposerOpen(false);

      setSelectedUserId("");

      setHeading("");

      setContent("");

      setPreview(null);

      setPreviewOpen(false);

      await loadMessages();

    } catch (error) {

      toast.error(error instanceof Error ? error.message : "Send failed");

    } finally {

      setSending(false);

    }

  }



  return (

    <div className="space-y-6">

      <div className="flex flex-wrap items-center justify-between gap-3">

        <p className="text-sm text-navy-500">

          Send RyvonX-branded announcements to investors and traders.

        </p>

        <Button type="button" onClick={() => setComposerOpen((open) => !open)}>

          <Plus className="mr-1.5 h-4 w-4" />

          Send Message

        </Button>

      </div>



      {composerOpen && (

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">

          <div>

            <h2 className="text-sm font-semibold text-navy-900">Send message</h2>

            <p className="mt-1 text-xs text-navy-500">

              Uses the standard RyvonX announcement layout. You provide the heading and content.

            </p>

          </div>



          <div className="mt-5 grid gap-5 lg:grid-cols-2">

            <div className="space-y-4">

              <div>

                <Label className="text-xs uppercase tracking-wide text-navy-400">Audience</Label>

                <div className="mt-2 flex flex-wrap gap-2">

                  {(["all", "individual"] as const).map((option) => (

                    <Button

                      key={option}

                      type="button"

                      size="sm"

                      variant={audience === option ? "default" : "outline"}

                      onClick={() => setAudience(option)}

                    >

                      {option === "all" ? "All Users" : "Individual User"}

                    </Button>

                  ))}

                </div>

                {audience === "all" && (

                  <p className="mt-2 text-xs text-navy-500">

                    Sends to every active registered user with an email address.

                  </p>

                )}

              </div>



              {audience === "individual" && (

                <div className="space-y-2">

                  <Label htmlFor="recipient-select">Recipient</Label>

                  {loadingRecipients ? (

                    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-navy-500">

                      <Loader2 className="h-4 w-4 animate-spin" />

                      Loading registered users...

                    </div>

                  ) : recipientUsers.length === 0 ? (

                    <p className="rounded-lg border border-border px-3 py-2 text-sm text-navy-500">

                      No registered users found.

                    </p>

                  ) : (

                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>

                      <SelectTrigger id="recipient-select" className="h-11">

                        <SelectValue placeholder="Select a registered email" />

                      </SelectTrigger>

                      <SelectContent className="max-h-72">

                        {recipientUsers.map((user) => (

                          <SelectItem key={user.id} value={user.id}>

                            {user.email}

                            {user.fullName ? ` — ${user.fullName}` : ""}

                          </SelectItem>

                        ))}

                      </SelectContent>

                    </Select>

                  )}

                </div>

              )}



              <div>

                <Label className="text-xs uppercase tracking-wide text-navy-400">Channel</Label>

                <div className="mt-2 flex flex-wrap gap-2">

                  {(

                    [

                      ["email", "Email"],

                      ["in_app", "In-App"],

                      ["both", "Email + In-App"],

                    ] as const

                  ).map(([value, label]) => (

                    <Button

                      key={value}

                      type="button"

                      size="sm"

                      variant={channelMode === value ? "default" : "outline"}

                      onClick={() => setChannelMode(value)}

                    >

                      {label}

                    </Button>

                  ))}

                </div>

              </div>

            </div>



            <div className="space-y-4">

              <div>

                <Label htmlFor="message-heading">Heading</Label>

                <Input

                  id="message-heading"

                  className="mt-2"

                  value={heading}

                  onChange={(event) => setHeading(event.target.value)}

                  placeholder="Announcement heading"

                />

              </div>

              <div>

                <Label htmlFor="message-content">Content</Label>

                <p className="mt-1 text-xs text-navy-500">
                  Format your message with bold, underline, headings, lists, and spacing.
                </p>

                <div className="mt-2">

                  <RichTextEditor

                    value={content}

                    onChange={setContent}

                    placeholder="Write your announcement for investors and traders..."

                  />

                </div>

              </div>

            </div>

          </div>



          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">

            <Button type="button" variant="outline" onClick={() => setComposerOpen(false)}>

              Cancel

            </Button>

            <Button type="button" variant="outline" disabled={previewing} onClick={handlePreview}>

              {previewing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}

              Preview

            </Button>

            <Button type="button" disabled={sending} onClick={handleSend}>

              {sending ? (

                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />

              ) : (

                <Send className="mr-1.5 h-4 w-4" />

              )}

              Send Message

            </Button>

          </div>

        </section>

      )}



      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>

        <DialogContent className="max-w-5xl">

          <DialogHeader>

            <DialogTitle>Message preview</DialogTitle>

            <DialogDescription>

              {audience === "all"
                ? "The email greeting uses each recipient's first name (for example, Hello Naomi, Hello Paul)."
                : "This is exactly what the selected recipient will see."}

            </DialogDescription>

          </DialogHeader>



          <div className="grid gap-5 lg:grid-cols-2">

            {(channelMode === "email" || channelMode === "both") && (

              <div className="space-y-2">

                <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">

                  <Mail className="h-4 w-4" />

                  Email

                </div>

                {preview?.emailSubject && (

                  <p className="rounded-lg border border-border bg-navy-50/40 px-3 py-2 text-sm text-navy-700">

                    <span className="font-medium text-navy-500">Subject:</span>{" "}

                    {preview.emailSubject}

                  </p>

                )}

                {preview?.emailHtml ? (

                  <iframe

                    title="Email preview"

                    srcDoc={preview.emailHtml}

                    className="h-[420px] w-full rounded-lg border border-border bg-white"

                    sandbox=""

                  />

                ) : (

                  <p className="rounded-lg border border-border px-3 py-8 text-center text-sm text-navy-500">

                    No email preview available.

                  </p>

                )}

              </div>

            )}



            {(channelMode === "in_app" || channelMode === "both") && (

              <div className="space-y-2">

                <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">

                  <Bell className="h-4 w-4" />

                  In-app notification

                </div>

                <div className="rounded-xl border border-border bg-navy-50/30 p-4">

                  <div className="mx-auto max-w-md rounded-xl border border-border bg-white p-4 shadow-sm">

                    <p className="text-sm font-semibold text-navy-900">

                      {preview?.inAppTitle ?? (heading || "Announcement")}

                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-navy-700">

                      {preview?.inAppBody ?? "Your announcement content will appear here."}

                    </p>

                    <p className="mt-3 text-xs text-navy-400">Just now · RyvonX</p>

                  </div>

                </div>

              </div>

            )}

          </div>

        </DialogContent>

      </Dialog>



      <section className="rounded-xl border border-border bg-card">

        <div className="border-b border-border px-5 py-4">

          <h2 className="text-sm font-semibold text-navy-900">Message history</h2>

        </div>

        <div className="overflow-x-auto">

          <table className="min-w-full text-sm">

            <thead>

              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-navy-400">

                <th className="px-5 py-3">Recipient</th>

                <th className="px-5 py-3">Heading</th>

                <th className="px-5 py-3">Status</th>

                <th className="px-5 py-3">Date</th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>

                  <td colSpan={4} className="px-5 py-8 text-center text-navy-500">

                    Loading messages...

                  </td>

                </tr>

              ) : messages.length === 0 ? (

                <tr>

                  <td colSpan={4} className="px-5 py-8 text-center text-navy-500">

                    No admin announcements sent yet.

                  </td>

                </tr>

              ) : (

                messages.map((message) => (

                  <tr key={message.id} className="border-b border-border/60">

                    <td className="px-5 py-3">

                      <p className="font-medium text-navy-900">{message.recipientName ?? "User"}</p>

                      <p className="text-xs text-navy-500">{message.recipientEmail ?? ""}</p>

                    </td>

                    <td className="px-5 py-3">{message.rendered_subject ?? "—"}</td>

                    <td className="px-5 py-3">

                      <span

                        className={cn(

                          "rounded-full px-2 py-0.5 text-xs font-semibold",

                          message.status === "delivered" || message.status === "sent"

                            ? "bg-emerald-50 text-emerald-700"

                            : message.status === "failed"

                              ? "bg-red-50 text-red-700"

                              : "bg-navy-50 text-navy-600"

                        )}

                      >

                        {message.status ?? "unknown"}

                      </span>

                    </td>

                    <td className="px-5 py-3 text-xs text-navy-500">

                      {message.created_at ? new Date(message.created_at).toLocaleString() : "—"}

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </section>

    </div>

  );

}


