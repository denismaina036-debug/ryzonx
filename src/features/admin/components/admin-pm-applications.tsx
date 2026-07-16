"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { PM_STATUS_LABELS } from "@/features/pool-manager/constants/nav";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PM_APPLICATION_STATUS, type PoolManagerApplicationStatus } from "@/domain/pool-manager/types";
import type { PoolManagerApplication } from "@/domain/pool-manager/types";

interface AdminPmApplicationsProps {
  applications: Array<
    PoolManagerApplication & { applicantName: string; applicantEmail: string }
  >;
}

export function AdminPmApplications({ applications }: AdminPmApplicationsProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    applications[0]?.id ?? null
  );
  const [status, setStatus] = useState<PoolManagerApplicationStatus>(
    PM_APPLICATION_STATUS.UNDER_REVIEW
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = applications.find((a) => a.id === selectedId);

  async function updateStatus() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pool-manager-applications/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 space-y-2">
        {applications.length === 0 ? (
          <p className="text-sm text-navy-500">No applications yet.</p>
        ) : (
          applications.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => setSelectedId(app.id)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                selectedId === app.id
                  ? "border-royal-500/40 bg-royal-500/10"
                  : "border-navy-100 bg-white hover:border-navy-200"
              }`}
            >
              <p className="font-medium text-navy-900">{app.applicantName}</p>
              <p className="text-xs text-navy-500">{app.applicantEmail}</p>
              <p className="mt-2 text-xs capitalize text-royal-600">
                {PM_STATUS_LABELS[app.status] ?? app.status}
              </p>
            </button>
          ))
        )}
      </div>

      {selected && (
        <div className="lg:col-span-3 rounded-xl border border-navy-100 bg-white p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-navy-900">{selected.applicantName}</h2>
            <p className="text-sm text-navy-500">Stage {selected.currentStage} · {PM_STATUS_LABELS[selected.status]}</p>
          </div>

          <section>
            <h3 className="text-sm font-semibold text-navy-800">Basic Information</h3>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <Item label="Experience" value={selected.basicInfo.tradingExperience} />
              <Item label="Years" value={selected.basicInfo.yearsTrading?.toString()} />
              <Item label="Country" value={selected.basicInfo.country} />
              <Item label="Style" value={selected.basicInfo.tradingStyle} />
            </dl>
            {selected.basicInfo.biography && (
              <p className="mt-3 text-sm text-navy-600 whitespace-pre-wrap">
                {selected.basicInfo.biography}
              </p>
            )}
          </section>

          {selected.strategyData.strategyName && (
            <section>
              <h3 className="text-sm font-semibold text-navy-800">Strategy</h3>
              <p className="mt-1 font-medium text-navy-900">{selected.strategyData.strategyName}</p>
              <p className="mt-2 text-sm text-navy-600 whitespace-pre-wrap">
                {selected.strategyData.tradingPhilosophy}
              </p>
              <p className="mt-2 text-sm text-navy-600 whitespace-pre-wrap">
                {selected.strategyData.riskManagement}
              </p>
            </section>
          )}

          <section className="border-t border-navy-100 pt-6 space-y-4">
            <h3 className="text-sm font-semibold text-navy-800">Update Status</h3>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Select value={status} onValueChange={(v) => setStatus(v as PoolManagerApplicationStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PM_APPLICATION_STATUS).map(([, value]) => (
                  <SelectItem key={value} value={value}>
                    {PM_STATUS_LABELS[value] ?? value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Review notes (visible to applicant on status change)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3">
              <Button onClick={updateStatus} disabled={loading}>
                {loading ? "Saving…" : "Save Review"}
              </Button>
              {selected.status === PM_APPLICATION_STATUS.APPROVED && (
                <Button variant="outline" asChild>
                  <Link href={ROUTES.poolManager}>View PM Dashboard</Link>
                </Button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-navy-500">{label}</dt>
      <dd className="text-navy-800">{value ?? "—"}</dd>
    </div>
  );
}
