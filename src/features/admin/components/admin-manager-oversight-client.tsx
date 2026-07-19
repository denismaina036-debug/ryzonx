"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { STRATEGY_STATUS_LABELS } from "@/constants/strategy";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { MANAGER_LEVEL_LABELS } from "@/constants/capital-allocation";
import { formatCurrency } from "@/lib/utils";
import type { ManagerOversightProfile } from "@/services/admin-manager-oversight.service";
import { AdminInternalNotesPanel } from "./admin-internal-notes-panel";
import { AdminMetricCard, AdminMetricGrid } from "./admin-page-header";
import { Award, Briefcase, Shield, TrendingUp, Users } from "lucide-react";

export function AdminManagerOversightClient({ profile }: { profile: ManagerOversightProfile }) {
  const { development } = profile;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-royal-600">Manager Oversight</p>
          <h2 className="mt-1 text-2xl font-semibold text-navy-950">{profile.displayName}</h2>
          <p className="mt-1 text-sm capitalize text-navy-500">
            {MANAGER_LEVEL_LABELS[profile.managerLevel as keyof typeof MANAGER_LEVEL_LABELS] ??
              profile.managerLevel.replace(/_/g, " ")}{" "}
            · {profile.status} · Governance: {profile.governanceStage.replace(/_/g, " ")}
          </p>
        </div>
        {profile.slug && (
          <Link
            href={`${ROUTES.managerPublicProfile}/${profile.slug}`}
            className="text-sm text-royal-600 hover:underline"
            target="_blank"
          >
            Public profile →
          </Link>
        )}
      </div>

      <AdminMetricGrid columns={4}>
        <AdminMetricCard label="Assets Under Management" value={formatCurrency(profile.totalAum)} icon={Briefcase} />
        <AdminMetricCard label="Cycle Investors" value={String(profile.totalInvestors)} icon={Users} />
        <AdminMetricCard label="Strategies" value={String(profile.strategies.length)} icon={TrendingUp} />
        <AdminMetricCard label="Achievements" value={String(development.achievements.length)} icon={Award} />
      </AdminMetricGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-navy-900">Strategies</h3>
          {profile.strategies.length === 0 ? (
            <p className="mt-3 text-sm text-navy-500">No strategies.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border/50">
              {profile.strategies.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <Link href={`${ROUTES.adminStrategies}/${s.id}`} className="text-sm font-medium text-navy-800 hover:text-royal-600">
                    {s.name}
                  </Link>
                  <span className="text-xs text-navy-500">{STRATEGY_STATUS_LABELS[s.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-navy-900">Investment Cycles</h3>
          {profile.cycles.length === 0 ? (
            <p className="mt-3 text-sm text-navy-500">No cycles.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border/50">
              {profile.cycles.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <Link href={`${ROUTES.adminInvestmentCycles}/${c.id}`} className="text-sm font-medium text-navy-800 hover:text-royal-600">
                    {c.name}
                  </Link>
                  <span className="text-xs text-navy-500">{INVESTMENT_CYCLE_STATUS_LABELS[c.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 font-semibold text-navy-900">
            <Shield className="h-4 w-4" />
            Governance & Pools
          </h3>
          {development.pools.length === 0 ? (
            <p className="mt-3 text-sm text-navy-500">No pools assigned.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {development.pools.map((pool) => (
                <li key={pool.id} className="flex justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                  <Link href={`${ROUTES.adminGovernance}/pools/${pool.id}`} className="font-medium text-navy-800 hover:text-royal-600">
                    {pool.name}
                  </Link>
                  <span className="text-xs capitalize text-navy-500">{pool.allocationStatus}</span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`${ROUTES.adminPoolManagersDevelopment}/${profile.managerId}`}
            className="mt-4 inline-block text-sm text-royal-600 hover:underline"
          >
            Development profile →
          </Link>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-navy-900">Achievements & Career</h3>
          <ul className="mt-4 space-y-3">
            {development.achievements.slice(0, 5).map((a) => (
              <li key={a.id} className="text-sm">
                <p className="font-medium text-navy-800">{a.title}</p>
                <p className="text-xs text-navy-500">{new Date(a.awardedAt).toLocaleDateString()}</p>
              </li>
            ))}
            {development.achievements.length === 0 && (
              <li className="text-sm text-navy-500">No achievements recorded.</li>
            )}
          </ul>
          {development.careerEvents.length > 0 && (
            <ul className="mt-4 border-t border-border/50 pt-4 space-y-2">
              {development.careerEvents.slice(0, 4).map((e) => (
                <li key={e.id} className="text-xs text-navy-600">
                  {e.title} · {new Date(e.createdAt).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <AdminInternalNotesPanel
        entityType="pool_manager"
        entityId={profile.managerId}
        initialNotes={profile.notes}
      />

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Recent Activity</h3>
        <ul className="mt-4 divide-y divide-border/50">
          {profile.recentActivity.length === 0 ? (
            <li className="py-2 text-sm text-navy-500">No recent activity.</li>
          ) : (
            profile.recentActivity.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-navy-800">{entry.summary}</p>
                  <p className="text-xs text-navy-500">{entry.actorName}</p>
                </div>
                <span className="shrink-0 text-xs text-navy-400">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
