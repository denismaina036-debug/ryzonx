"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cryptoFlowPrimaryButtonClass } from "@/features/investor/components/crypto-flow/crypto-flow-step";
import {
  investorCardElevatedClass,
  investorInputClass,
  investorLabelClass,
  investorPageSubtitleClass,
  investorPageTitleClass,
  investorReadOnlyClass,
} from "@/features/investor/constants/ui";
import { getInitials } from "@/lib/utils";
import type { InvestorSettingsData } from "@/features/investor/types/account";

export function InvestorSettingsView({
  settings: initial,
}: {
  settings: InvestorSettingsData;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [showPublic, setShowPublic] = useState(initial.showActivityPublicly);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/investor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          showActivityPublicly: showPublic,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Save failed");
      setSettings(body);
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-8">
        <h1 className={investorPageTitleClass}>Settings</h1>
        <p className={investorPageSubtitleClass}>
          Your personal account information and preferences.
        </p>
      </div>

      <div className={`${investorCardElevatedClass} p-5 sm:p-6`}>
        <div className="mb-6 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full [background:var(--id-accent-gradient)] text-lg font-semibold text-white">
            {getInitials(settings.fullName)}
          </span>
          <div>
            <p className="font-medium text-[var(--id-text)]">{settings.fullName}</p>
            <p className="text-sm text-[var(--id-text-muted)]">{settings.email}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={investorInputClass}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={investorInputClass}
            />
          </Field>
          <ReadOnlyField label="Email" value={settings.email} />
          <ReadOnlyField label="Role" value={settings.role} />
          <ReadOnlyField label="Account status" value={settings.accountStatus} />
          <ReadOnlyField
            label="Member since"
            value={new Date(settings.createdAt).toLocaleDateString()}
          />
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[var(--id-text-secondary)]">
          <input
            type="checkbox"
            checked={showPublic}
            onChange={(e) => setShowPublic(e.target.checked)}
            className="rounded border-[var(--id-border)] accent-[var(--id-accent)]"
          />
          Show my deposit/withdrawal activity publicly
        </label>

        <Button
          className={`mt-6 ${cryptoFlowPrimaryButtonClass}`}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className={investorLabelClass}>{label}</p>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={investorLabelClass}>{label}</p>
      <p className={investorReadOnlyClass}>{value}</p>
    </div>
  );
}
