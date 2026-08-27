"use client";

import { useState } from "react";
import { Bot, CheckCircle2, Loader2, Save, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TelegramAdminConfig } from "@/services/communication/telegram/telegram-config.service";

interface SettingsShape {
  sender?: { name?: string; email?: string; reply_to?: string };
  support?: { email?: string };
  footer?: { company?: string; address?: string; privacy_url?: string; terms_url?: string };
  social?: { website?: string; twitter?: string; linkedin?: string };
  defaults?: { channels?: string[]; critical_bypass_preferences?: boolean };
}

export function AdminCommunicationSettingsView({
  initialSettings,
  initialTelegram,
}: {
  initialSettings: Record<string, unknown>;
  initialTelegram: TelegramAdminConfig;
}) {
  const sender = (initialSettings.sender ?? {}) as SettingsShape["sender"];
  const support = (initialSettings.support ?? {}) as SettingsShape["support"];
  const footer = (initialSettings.footer ?? {}) as SettingsShape["footer"];
  const social = (initialSettings.social ?? {}) as SettingsShape["social"];

  const [form, setForm] = useState({
    senderName: sender?.name ?? "RyvonX",
    senderEmail: sender?.email ?? "",
    replyTo: sender?.reply_to ?? "",
    supportEmail: support?.email ?? "",
    company: footer?.company ?? "",
    address: footer?.address ?? "",
    privacyUrl: footer?.privacy_url ?? "",
    termsUrl: footer?.terms_url ?? "",
    website: social?.website ?? "",
    twitter: social?.twitter ?? "",
    linkedin: social?.linkedin ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [telegram, setTelegram] = useState(initialTelegram);
  const [telegramForm, setTelegramForm] = useState({
    enabled: initialTelegram.enabled,
    botToken: "",
    chatId: initialTelegram.chatId,
    appendWebsiteLink: initialTelegram.appendWebsiteLink,
  });
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  async function saveTelegram() {
    setSavingTelegram(true);
    try {
      const res = await fetch("/api/admin/communication/settings/telegram", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(telegramForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save Telegram settings");
      setTelegram(data.telegram);
      setTelegramForm((current) => ({ ...current, botToken: "" }));
      toast.success("Telegram settings saved securely.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save Telegram settings");
    } finally {
      setSavingTelegram(false);
    }
  }

  async function testTelegram() {
    setTestingTelegram(true);
    try {
      const res = await fetch("/api/admin/communication/settings/telegram/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Telegram test failed");
      toast.success(data.message);
      const refreshed = await fetch("/api/admin/communication/settings/telegram");
      const refreshedData = await refreshed.json();
      if (refreshed.ok) setTelegram(refreshedData.telegram);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Telegram test failed");
    } finally {
      setTestingTelegram(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/communication/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: { name: form.senderName, email: form.senderEmail, reply_to: form.replyTo },
          support: { email: form.supportEmail },
          footer: {
            company: form.company,
            address: form.address,
            privacy_url: form.privacyUrl,
            terms_url: form.termsUrl,
          },
          social: { website: form.website, twitter: form.twitter, linkedin: form.linkedin },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border bg-gradient-to-r from-sky-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-sky-500 p-2.5 text-white"><Bot className="h-5 w-5" /></span>
            <div>
              <h3 className="text-sm font-semibold text-navy-900">Telegram Integration</h3>
              <p className="mt-1 text-xs text-navy-500">Publish general announcements to your configured Telegram channel.</p>
            </div>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${telegram.enabled ? (telegram.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700") : "bg-navy-50 text-navy-500"}`}>
            {telegram.enabled ? (telegram.ready ? "Connected" : "Setup required") : "Disabled"}
          </span>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telegram-token">Bot Token</Label>
              <Input id="telegram-token" type="password" autoComplete="new-password" value={telegramForm.botToken} onChange={(event) => setTelegramForm({ ...telegramForm, botToken: event.target.value })} placeholder={telegram.tokenConfigured ? "Replace configured token" : "123456789:AA…"} />
              <p className="text-xs text-navy-500">
                {telegram.tokenConfigured ? <><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />Token configured{telegram.tokenLastFour ? ` · ends in ${telegram.tokenLastFour}` : ""}</> : "The saved token is encrypted and is never returned to this page."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram-chat-id">Channel / Chat ID</Label>
              <Input id="telegram-chat-id" value={telegramForm.chatId} onChange={(event) => setTelegramForm({ ...telegramForm, chatId: event.target.value })} placeholder="@ryvonx or -100…" />
              {(telegram.botUsername || telegram.destinationTitle) && <p className="text-xs text-navy-500">{telegram.botUsername ? `Bot: @${telegram.botUsername}` : ""}{telegram.botUsername && telegram.destinationTitle ? " · " : ""}{telegram.destinationTitle ? `Channel: ${telegram.destinationTitle}` : ""}</p>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
              <span><span className="block font-medium text-navy-900">Telegram Publishing</span><span className="text-xs text-navy-500">Enable Telegram in the announcement composer.</span></span>
              <input type="checkbox" className="h-4 w-4 accent-sky-500" checked={telegramForm.enabled} onChange={(event) => setTelegramForm({ ...telegramForm, enabled: event.target.checked })} />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
              <span><span className="block font-medium text-navy-900">Append RyvonX Website Link</span><span className="text-xs text-navy-500">Adds the canonical website link unless already present.</span></span>
              <input type="checkbox" className="h-4 w-4 accent-sky-500" checked={telegramForm.appendWebsiteLink} onChange={(event) => setTelegramForm({ ...telegramForm, appendWebsiteLink: event.target.checked })} />
            </label>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-xs text-sky-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Before connecting, add the RyvonX bot to your Telegram channel as an administrator and allow it to post messages.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" disabled={savingTelegram} onClick={saveTelegram}>
              {savingTelegram ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save Telegram settings
            </Button>
            <Button type="button" variant="outline" disabled={testingTelegram || !telegram.tokenConfigured || !telegram.chatId} onClick={testTelegram}>
              {testingTelegram ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />} Test connection
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-800">Default sender</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} placeholder="Sender name" />
          <Input value={form.senderEmail} onChange={(e) => setForm({ ...form, senderEmail: e.target.value })} placeholder="Sender email" />
          <Input value={form.replyTo} onChange={(e) => setForm({ ...form, replyTo: e.target.value })} placeholder="Reply-to email" />
          <Input value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} placeholder="Support email" />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-800">Company & legal</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
          <Input value={form.privacyUrl} onChange={(e) => setForm({ ...form, privacyUrl: e.target.value })} placeholder="Privacy URL" />
          <Input value={form.termsUrl} onChange={(e) => setForm({ ...form, termsUrl: e.target.value })} placeholder="Terms URL" />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-800">Social media</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website" />
          <Input value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="Twitter/X" />
          <Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="LinkedIn" />
        </div>
      </section>

      <Button type="button" disabled={saving} onClick={save}>
        <Save className="mr-1.5 h-3.5 w-3.5" /> Save settings
      </Button>
    </div>
  );
}
