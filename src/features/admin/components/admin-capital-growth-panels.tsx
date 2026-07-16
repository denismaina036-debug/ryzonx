"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import {
  MANAGER_LEVEL_LABELS,
  MANAGER_LEVEL_ORDER,
  CONTENT_TYPE_LABELS,
} from "@/constants/capital-allocation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ManagerDevelopmentProfile,
  ManagerContentItem,
  AchievementDefinition,
} from "@/domain/capital-allocation/types";
import { formatCurrency } from "@/lib/utils";

export function AdminManagerDevelopmentDetail({ profile }: { profile: ManagerDevelopmentProfile }) {
  const router = useRouter();
  const [newLevel, setNewLevel] = useState(profile.managerLevel);
  const [notes, setNotes] = useState("");

  async function promote() {
    try {
      const res = await fetch(`/api/admin/manager-development/${profile.managerId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newLevel, notes }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Promotion recorded");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xl font-bold text-navy-900">{profile.displayName}</h2>
        <p className="mt-1 text-sm text-royal-600">
          {MANAGER_LEVEL_LABELS[profile.managerLevel] ?? profile.managerLevel}
        </p>
        {profile.developmentNotes && (
          <p className="mt-3 text-sm text-navy-600">{profile.developmentNotes}</p>
        )}
      </section>

      {profile.nextLevel && (
        <section className="rounded-xl border border-royal-100 bg-royal-50/30 p-5">
          <h3 className="font-semibold text-navy-900">Promotion Requirements — {MANAGER_LEVEL_LABELS[profile.nextLevel]}</h3>
          <ul className="mt-3 list-disc pl-5 text-sm text-navy-700">
            {profile.promotionRequirements.map((req) => (
              <li key={req}>{req}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Select value={newLevel} onValueChange={setNewLevel}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MANAGER_LEVEL_ORDER.map((l) => (
                  <SelectItem key={l} value={l}>{MANAGER_LEVEL_LABELS[l]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Committee notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} className="flex-1 min-w-[200px]" />
            <Button onClick={promote}>Record promotion</Button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Achievements</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.achievements.map((a) => (
            <span key={a.id} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              {a.title}
            </span>
          ))}
          {profile.achievements.length === 0 && <p className="text-sm text-navy-500">No achievements yet.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Career Timeline</h3>
        <ul className="mt-4 space-y-3">
          {profile.careerEvents.map((e) => (
            <li key={e.id} className="border-l-2 border-royal-200 pl-4">
              <p className="text-sm font-medium">{e.title}</p>
              <p className="text-xs text-navy-500">{new Date(e.createdAt).toLocaleString()}</p>
              {e.committeeLabel && <p className="text-xs italic text-royal-600">{e.committeeLabel}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Managed Pools</h3>
        <ul className="mt-3 space-y-2">
          {profile.pools.map((p) => (
            <li key={p.id} className="text-sm">
              {p.name} — {formatCurrency(p.totalAum)}
              {p.isRyvonxBacked && <span className="ml-2 text-amber-600">RyvonX Backed</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function AdminManagerDevelopmentList({
  managers,
}: {
  managers: Array<{ id: string; displayName: string; managerLevel: string; poolsManaged: number }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card divide-y">
      {managers.map((m) => (
        <Link
          key={m.id}
          href={`${ROUTES.adminManagerDevelopment}/${m.id}`}
          className="flex items-center justify-between px-5 py-4 hover:bg-surface-1"
        >
          <div>
            <p className="font-medium text-navy-800">{m.displayName}</p>
            <p className="text-xs text-navy-500">{MANAGER_LEVEL_LABELS[m.managerLevel] ?? m.managerLevel}</p>
          </div>
          <span className="text-sm text-navy-500">{m.poolsManaged} pools</span>
        </Link>
      ))}
    </div>
  );
}

export function AdminContentApprovalQueue({ items }: { items: ManagerContentItem[] }) {
  const router = useRouter();

  async function review(id: string, approve: boolean) {
    try {
      const res = await fetch(`/api/admin/pool-content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(approve ? "Published" : "Rejected");
      router.refresh();
    } catch {
      toast.error("Review failed");
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-navy-500">No content awaiting approval.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs text-navy-500">{CONTENT_TYPE_LABELS[item.contentType] ?? item.contentType}</p>
              <h3 className="font-semibold text-navy-900">{item.title}</h3>
              <p className="text-sm text-navy-500">{item.managerName}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => review(item.id, true)}>Approve & publish</Button>
              <Button size="sm" variant="outline" onClick={() => review(item.id, false)}>Reject</Button>
            </div>
          </div>
          <p className="mt-3 text-sm text-navy-700 whitespace-pre-wrap line-clamp-6">{item.body}</p>
        </article>
      ))}
    </div>
  );
}

export function AdminAchievementsPanel({
  definitions,
  managers,
}: {
  definitions: AchievementDefinition[];
  managers: Array<{ id: string; displayName: string }>;
}) {
  const router = useRouter();
  const [managerId, setManagerId] = useState(managers[0]?.id ?? "");
  const [achievementKey, setAchievementKey] = useState(definitions[0]?.achievementKey ?? "");

  async function award() {
    const def = definitions.find((d) => d.achievementKey === achievementKey);
    if (!managerId || !def) return;
    try {
      const res = await fetch("/api/admin/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId,
          achievementKey: def.achievementKey,
          title: def.title,
          description: def.description,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Achievement awarded");
      router.refresh();
    } catch {
      toast.error("Failed to award");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-navy-500">Manager</label>
          <Select value={managerId} onValueChange={setManagerId}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {managers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-navy-500">Achievement</label>
          <Select value={achievementKey} onValueChange={setAchievementKey}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {definitions.map((d) => (
                <SelectItem key={d.achievementKey} value={d.achievementKey}>{d.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={award}>Award achievement</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {definitions.map((d) => (
          <div key={d.id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-semibold text-navy-800">{d.title}</p>
            <p className="mt-1 text-xs text-navy-500">{d.description}</p>
            <p className="mt-2 text-[10px] uppercase text-navy-400">{d.category}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
