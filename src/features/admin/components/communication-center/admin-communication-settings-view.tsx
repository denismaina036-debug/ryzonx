"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SettingsShape {
  sender?: { name?: string; email?: string; reply_to?: string };
  support?: { email?: string };
  footer?: { company?: string; address?: string; privacy_url?: string; terms_url?: string };
  social?: { website?: string; twitter?: string; linkedin?: string };
  defaults?: { channels?: string[]; critical_bypass_preferences?: boolean };
}

export function AdminCommunicationSettingsView({
  initialSettings,
}: {
  initialSettings: Record<string, unknown>;
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
