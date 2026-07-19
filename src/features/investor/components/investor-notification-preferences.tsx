"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { USER_PREFERENCE_CATEGORIES } from "@/constants/communication";
import { COMMUNICATION_CATEGORY_LABELS } from "@/constants/communication";
import type { NotificationPreference } from "@/services/notification-preference.service";
import {
  investorCardElevatedClass,
  investorLabelClass,
  investorPageSubtitleClass,
  investorPageTitleClass,
} from "@/features/investor/constants/ui";

const CHANNELS = ["in_app", "email"] as const;

export function InvestorNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/investor/notification-preferences")
      .then((res) => res.json())
      .then((json: { preferences?: NotificationPreference[] }) => {
        setPreferences(json.preferences ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function isEnabled(category: string, channel: string): boolean {
    return preferences.find((p) => p.category === category && p.channel === channel)?.isEnabled ?? true;
  }

  function toggle(category: NotificationPreference["category"], channel: NotificationPreference["channel"]) {
    setPreferences((prev) => {
      const existing = prev.find((p) => p.category === category && p.channel === channel);
      if (existing) {
        return prev.map((p) =>
          p.category === category && p.channel === channel ? { ...p, isEnabled: !p.isEnabled } : p
        );
      }
      return [...prev, { category, channel, isEnabled: false }];
    });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/investor/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });
      const json = (await res.json()) as { error?: string; preferences?: NotificationPreference[] };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setPreferences(json.preferences ?? preferences);
      toast.success("Notification preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--id-text-muted)]">Loading preferences…</p>;
  }

  return (
    <div className={`${investorCardElevatedClass} p-5 sm:p-6`}>
      <h2 className="text-sm font-semibold text-[var(--id-text)]">Notification Preferences</h2>
      <p className={`mt-1 ${investorPageSubtitleClass}`}>
        Choose which updates you receive by channel. Financial and investment alerts respect these settings.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--id-border)] text-left text-[var(--id-text-muted)]">
              <th className="pb-2 pr-4">Category</th>
              {CHANNELS.map((ch) => (
                <th key={ch} className="pb-2 px-2 capitalize">
                  {ch.replace("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {USER_PREFERENCE_CATEGORIES.map((category) => (
              <tr key={category} className="border-b border-[var(--id-border)]/60">
                <td className={`py-3 pr-4 ${investorLabelClass}`}>
                  {COMMUNICATION_CATEGORY_LABELS[category] ?? category}
                </td>
                {CHANNELS.map((channel) => (
                  <td key={channel} className="py-3 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={isEnabled(category, channel)}
                      onChange={() => toggle(category, channel)}
                      aria-label={`${category} ${channel}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button className="mt-4" size="sm" onClick={() => void save()} disabled={saving}>
        {saving ? "Saving…" : "Save preferences"}
      </Button>
    </div>
  );
}

export function InvestorNotificationPreferencesPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[760px]">
      <div className="mb-6">
        <h1 className={investorPageTitleClass}>Notification Preferences</h1>
        <p className={investorPageSubtitleClass}>
          Control in-app and email notifications for investments, financial updates, and system alerts.
        </p>
      </div>
      <InvestorNotificationPreferences />
    </div>
  );
}
