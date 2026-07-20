"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PmAdmissionSettings } from "@/domain/pool-manager/admission-settings";

export function AdminPmAdmissionSettingsForm({
  initialSettings,
}: {
  initialSettings: PmAdmissionSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  function patch(partial: Partial<PmAdmissionSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pm-admission-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.settings) setSettings(data.settings);
      toast.success("Admission settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-navy-100 bg-white p-6">
        <h2 className="text-base font-semibold text-navy-900">Admission Fees</h2>
        <p className="mt-1 text-sm text-navy-500">
          Fees shown to applicants during admission path selection.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Trading Challenge Fee ($)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={settings.tradingChallengeFee}
              onChange={(e) => patch({ tradingChallengeFee: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Direct Access Fee ($)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={settings.directAccessFee}
              onChange={(e) => patch({ directAccessFee: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-navy-100 bg-white p-6">
        <h2 className="text-base font-semibold text-navy-900">Challenge Parameters</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Duration (days)">
            <Input
              type="number"
              min={1}
              value={settings.challengeDurationDays}
              onChange={(e) => patch({ challengeDurationDays: Number(e.target.value) || 30 })}
            />
          </Field>
          <Field label="Profit Target (%)">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={settings.challengeProfitTargetPct}
              onChange={(e) => patch({ challengeProfitTargetPct: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Maximum Drawdown (%)">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={settings.challengeMaxDrawdownPct}
              onChange={(e) => patch({ challengeMaxDrawdownPct: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Daily Drawdown (%)">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={settings.challengeDailyDrawdownPct}
              onChange={(e) => patch({ challengeDailyDrawdownPct: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-navy-700">
          <input
            type="checkbox"
            checked={settings.challengeJournalRequired}
            onChange={(e) => patch({ challengeJournalRequired: e.target.checked })}
          />
          Trading journal required for challenge completion
        </label>
      </section>

      <section className="rounded-xl border border-navy-100 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-navy-900">Challenge Content</h2>
        <Field label="Challenge Instructions">
          <Textarea rows={4} value={settings.challengeInstructions} onChange={(e) => patch({ challengeInstructions: e.target.value })} />
        </Field>
        <Field label="Challenge Rules">
          <Textarea rows={4} value={settings.challengeRules} onChange={(e) => patch({ challengeRules: e.target.value })} />
        </Field>
        <Field label="Challenge Requirements">
          <Textarea rows={3} value={settings.challengeRequirements} onChange={(e) => patch({ challengeRequirements: e.target.value })} />
        </Field>
        <Field label="Passing Criteria">
          <Textarea rows={3} value={settings.challengePassingCriteria} onChange={(e) => patch({ challengePassingCriteria: e.target.value })} />
        </Field>
        <Field label="Challenge Documentation">
          <Textarea rows={3} value={settings.challengeDocumentation} onChange={(e) => patch({ challengeDocumentation: e.target.value })} />
        </Field>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save Admission Settings"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
