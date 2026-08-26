"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Crown, Save, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PmAdmissionTier } from "@/domain/pool-manager/admission-tier";

type TemplateOption = { id: string; name: string };

export function AdminPmAdmissionTiers({
  initialTiers,
  templates,
}: {
  initialTiers: PmAdmissionTier[];
  templates: TemplateOption[];
}) {
  const [tiers, setTiers] = useState(initialTiers);
  const [savingId, setSavingId] = useState<string | null>(null);

  function patch(id: string, partial: Partial<PmAdmissionTier>) {
    setTiers((current) => current.map((tier) => tier.id === id ? { ...tier, ...partial } : tier));
  }

  async function save(tier: PmAdmissionTier) {
    setSavingId(tier.id);
    try {
      const response = await fetch(`/api/admin/pm-admission-tiers/${tier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tier.name,
          description: tier.description,
          maxCapital: tier.maxCapital,
          challengeFee: tier.challengeFee,
          instantAccessFee: tier.instantAccessFee,
          challengeTemplateId: tier.challengeTemplateId,
          isActive: tier.isActive,
          isFeatured: tier.isFeatured,
          sortOrder: tier.sortOrder,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Save failed.");
      setTiers((current) => current.map((item) => item.id === tier.id ? body.tier : item));
      toast.success(`${tier.name} tier saved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 shadow-[var(--id-shadow)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--id-accent-text)]"><Crown className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Capital access catalog</span></div>
          <h2 className="mt-2 text-xl font-semibold text-[var(--id-text)]">Admission tiers</h2>
          <p className="mt-1 max-w-3xl text-sm text-[var(--id-text-secondary)]">Control the public capital ceilings, Challenge fees, Instant Access fees, and evaluation template. Updates apply only to future applications.</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" />Existing application snapshots are protected</div>
      </div>

      <div className="mt-6 space-y-4">
        {tiers.map((tier) => (
          <article key={tier.id} className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"><Sparkles className="h-4 w-4" /></div>
                <div><p className="font-semibold text-[var(--id-text)]">{tier.name}</p><p className="text-xs uppercase tracking-wider text-[var(--id-text-muted)]">{tier.slug}</p></div>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--id-text-secondary)]">
                <label className="flex items-center gap-2"><input type="checkbox" checked={tier.isFeatured} onChange={(event) => patch(tier.id, { isFeatured: event.target.checked })} /> Featured</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={tier.isActive} onChange={(event) => patch(tier.id, { isActive: event.target.checked })} /> Available</label>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <Field label="Public name"><Input value={tier.name} onChange={(event) => patch(tier.id, { name: event.target.value })} /></Field>
              <Field label="Maximum capital ($)"><Input type="number" min={1} max={1_000_000} value={tier.maxCapital} onChange={(event) => patch(tier.id, { maxCapital: Number(event.target.value) })} /></Field>
              <Field label="Challenge fee ($)"><Input type="number" min={0} value={tier.challengeFee} onChange={(event) => patch(tier.id, { challengeFee: Number(event.target.value) })} /></Field>
              <Field label="Instant Access fee ($)"><Input type="number" min={0} value={tier.instantAccessFee} onChange={(event) => patch(tier.id, { instantAccessFee: Number(event.target.value) })} /></Field>
              <Field label="Challenge template">
                <select className="h-10 w-full rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] px-3 text-sm text-[var(--id-text)]" value={tier.challengeTemplateId ?? ""} onChange={(event) => patch(tier.id, { challengeTemplateId: event.target.value || null })}>
                  <option value="">Default template</option>
                  {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </Field>
              <Field label="Display order"><Input type="number" min={0} value={tier.sortOrder} onChange={(event) => patch(tier.id, { sortOrder: Number(event.target.value) })} /></Field>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Description"><Input value={tier.description} onChange={(event) => patch(tier.id, { description: event.target.value })} /></Field>
              <Button onClick={() => void save(tier)} disabled={savingId === tier.id}><Save className="h-4 w-4" />{savingId === tier.id ? "Saving…" : "Save tier"}</Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
