"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GOVERNANCE_STAGE_LABELS,
  GOVERNANCE_SCORE_CATEGORIES,
  GOVERNANCE_SCORE_CATEGORY_LABELS,
  REVIEW_FREQUENCY_LABELS,
  WARNING_LEVEL_LABELS,
  RULE_TYPE_LABELS,
} from "@/constants/governance";
import type { PoolGovernanceDetail } from "@/domain/governance/types";
import { PROTECTION_INDICATOR_LABELS } from "@/constants/governance";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export function AdminGovernancePoolPanel({ detail }: { detail: PoolGovernanceDetail }) {
  const router = useRouter();
  const { pool, monitoringMetrics } = detail;
  const [busy, setBusy] = useState(false);

  async function post(path: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      toast.success("Governance action recorded");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Monitoring metrics */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Continuous Monitoring</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="AUM" value={formatCurrency(monitoringMetrics.assetsUnderManagement)} />
          <Metric label="Investors" value={String(monitoringMetrics.activeInvestors)} />
          <Metric label="Monthly Return" value={monitoringMetrics.monthlyReturnPct != null ? formatPercentage(monitoringMetrics.monthlyReturnPct) : "—"} />
          <Metric label="Max Drawdown" value={monitoringMetrics.maxDrawdownPct != null ? formatPercentage(monitoringMetrics.maxDrawdownPct) : "—"} />
          <Metric label="Win Rate" value={monitoringMetrics.winRatePct != null ? `${monitoringMetrics.winRatePct}%` : "—"} />
          <Metric label="Open Violations" value={String(monitoringMetrics.openViolations)} />
          <Metric label="Warnings" value={String(monitoringMetrics.recentWarnings)} />
          <Metric label="Stage" value={GOVERNANCE_STAGE_LABELS[pool.governanceStage] ?? pool.governanceStage} />
        </div>
      </section>

      {/* Protection indicators */}
      <section className="rounded-xl border border-royal-100 bg-royal-50/30 p-5">
        <h3 className="font-semibold text-navy-900">Investor Protection Indicators</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {detail.protectionIndicators.map((ind) => (
            <span key={ind} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-royal-700 shadow-sm">
              {PROTECTION_INDICATOR_LABELS[ind] ?? ind}
            </span>
          ))}
        </div>
      </section>

      {pool.governanceStage === "suspended" && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <h3 className="font-semibold text-rose-900">Suspended by RyvonX</h3>
          <p className="mt-2 text-sm text-rose-800">{pool.suspensionReason}</p>
          {pool.suspendedAt && (
            <p className="mt-1 text-xs text-rose-600">
              {new Date(pool.suspendedAt).toLocaleString()}
            </p>
          )}
          {pool.suspensionNotes && (
            <p className="mt-2 text-sm text-rose-700">{pool.suspensionNotes}</p>
          )}
        </section>
      )}

      <GovernanceActions poolId={pool.id} busy={busy} onAction={post} pool={pool} />

      {/* Timeline */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Governance Timeline</h3>
        <ul className="mt-4 space-y-3">
          {detail.timeline.length === 0 ? (
            <li className="text-sm text-navy-500">No timeline events yet.</li>
          ) : (
            detail.timeline.map((e) => (
              <li key={e.id} className="border-l-2 border-royal-200 pl-4">
                <p className="text-sm font-medium text-navy-800">{e.title}</p>
                <p className="text-xs text-navy-500">{new Date(e.createdAt).toLocaleString()}</p>
                {e.committeeLabel && (
                  <p className="text-xs italic text-royal-600">{e.committeeLabel}</p>
                )}
                {e.description && <p className="mt-1 text-sm text-navy-600">{e.description}</p>}
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Violations & warnings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ListSection title="Violations" empty="No violations.">
          {detail.violations.map((v) => (
            <li key={v.id} className="text-sm">
              <span className="font-medium">{v.ruleName}</span>
              <span className="ml-2 text-xs text-navy-500">{v.status}</span>
            </li>
          ))}
        </ListSection>
        <ListSection title="Warnings" empty="No warnings.">
          {detail.warnings.map((w) => (
            <li key={w.id} className="text-sm">
              <span className="font-medium">{w.title}</span>
              <span className="ml-2 text-xs text-navy-500">
                {WARNING_LEVEL_LABELS[w.level] ?? w.level}
              </span>
            </li>
          ))}
        </ListSection>
      </div>

      {/* Reviews */}
      <ListSection title="Governance Reviews" empty="No reviews recorded.">
        {detail.reviews.map((r) => (
          <li key={r.id} className="border-b border-border/50 pb-3 last:border-0">
            <p className="text-sm font-medium">{r.reviewType} — {r.reviewDate}</p>
            {r.committeeLabel && <p className="text-xs italic text-royal-600">{r.committeeLabel}</p>}
            {r.recommendation && <p className="mt-1 text-sm text-navy-600">{r.recommendation}</p>}
          </li>
        ))}
      </ListSection>

      {/* Scores */}
      <GovernanceScores poolId={pool.id} scores={detail.scores} busy={busy} onAction={post} />
    </div>
  );
}

function GovernanceActions({
  poolId,
  busy,
  onAction,
  pool,
}: {
  poolId: string;
  busy: boolean;
  onAction: (path: string, body: Record<string, unknown>) => Promise<void>;
  pool: PoolGovernanceDetail["pool"];
}) {
  const [stage, setStage] = useState(pool.governanceStage);
  const [warningTitle, setWarningTitle] = useState("");
  const [warningReason, setWarningReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [probationEnd, setProbationEnd] = useState("");
  const [violationRule, setViolationRule] = useState("max_daily_drawdown");
  const [actualValue, setActualValue] = useState("");
  const [expectedValue, setExpectedValue] = useState("5");

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-6">
      <h3 className="font-semibold text-navy-900">Governance Actions</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-navy-600">Change governance stage</label>
          <div className="flex gap-2">
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(GOVERNANCE_STAGE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                onAction(`/api/admin/governance/pools/${poolId}/stage`, { stage })
              }
            >
              Apply
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-navy-600">Restrictions</label>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                onAction(`/api/admin/governance/pools/${poolId}/restrictions`, {
                  pauseNewInvestments: true,
                })
              }
            >
              Pause new investments
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                onAction(`/api/admin/governance/pools/${poolId}/restrictions`, {
                  hideFromMarketplace: true,
                })
              }
            >
              Hide from marketplace
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-navy-600">Issue warning</label>
        <Input placeholder="Title" value={warningTitle} onChange={(e) => setWarningTitle(e.target.value)} />
        <Textarea placeholder="Reason" value={warningReason} onChange={(e) => setWarningReason(e.target.value)} rows={2} />
        <Button
          size="sm"
          disabled={busy || !warningTitle}
          onClick={() =>
            onAction(`/api/admin/governance/pools/${poolId}/warning`, {
              level: "major",
              title: warningTitle,
              reason: warningReason,
            })
          }
        >
          Issue warning
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-navy-600">Start probation</label>
          <Input type="date" value={probationEnd} onChange={(e) => setProbationEnd(e.target.value)} />
          <Button
            size="sm"
            disabled={busy || !probationEnd}
            onClick={() =>
              onAction(`/api/admin/governance/pools/${poolId}/probation`, {
                endsAt: new Date(probationEnd).toISOString(),
                pauseNewInvestments: true,
              })
            }
          >
            Start probation
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-navy-600">Suspend pool</label>
          <Textarea placeholder="Suspension reason" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || !suspendReason}
              onClick={() =>
                onAction(`/api/admin/governance/pools/${poolId}/suspend`, {
                  reason: suspendReason,
                })
              }
            >
              Suspend
            </Button>
            {pool.governanceStage === "suspended" && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  onAction(`/api/admin/governance/pools/${poolId}/reactivate`, {})
                }
              >
                Reactivate
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-navy-600">Record rule violation</label>
        <div className="flex flex-wrap gap-2">
          <Select value={violationRule} onValueChange={setViolationRule}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="w-24" placeholder="Actual" value={actualValue} onChange={(e) => setActualValue(e.target.value)} />
          <Input className="w-24" placeholder="Expected" value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} />
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              onAction(`/api/admin/governance/pools/${poolId}/violations`, {
                ruleKey: violationRule,
                ruleName: RULE_TYPE_LABELS[violationRule] ?? violationRule,
                actualValue: actualValue ? Number(actualValue) : null,
                expectedValue: expectedValue ? Number(expectedValue) : null,
              })
            }
          >
            Record violation
          </Button>
        </div>
      </div>

      <ReviewForm poolId={poolId} busy={busy} onAction={onAction} />
    </section>
  );
}

function ReviewForm({
  poolId,
  busy,
  onAction,
}: {
  poolId: string;
  busy: boolean;
  onAction: (path: string, body: Record<string, unknown>) => Promise<void>;
}) {
  const [reviewType, setReviewType] = useState("monthly");
  const [recommendation, setRecommendation] = useState("");
  const [observations, setObservations] = useState("");

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <label className="text-xs font-medium text-navy-600">Complete governance review</label>
      <Select value={reviewType} onValueChange={setReviewType}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(REVIEW_FREQUENCY_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea placeholder="Observations" value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} />
      <Textarea placeholder="Recommendation" value={recommendation} onChange={(e) => setRecommendation(e.target.value)} rows={2} />
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          onAction(`/api/admin/governance/pools/${poolId}/review`, {
            reviewType,
            observations,
            recommendation,
            visibility: "internal",
          })
        }
      >
        Publish review
      </Button>
    </div>
  );
}

function GovernanceScores({
  poolId,
  scores,
  busy,
  onAction,
}: {
  poolId: string;
  scores: PoolGovernanceDetail["scores"];
  busy: boolean;
  onAction: (path: string, body: Record<string, unknown>) => Promise<void>;
}) {
  const [category, setCategory] = useState<string>(GOVERNANCE_SCORE_CATEGORIES[0]);
  const [score, setScore] = useState("7");

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold text-navy-900">Governance Scoring</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {scores.map((s) => (
          <div key={s.id} className="rounded-lg bg-surface-1 px-3 py-2 text-sm">
            <span className="font-medium">
              {GOVERNANCE_SCORE_CATEGORY_LABELS[s.category] ?? s.category}
            </span>
            <span className="ml-2 text-royal-600">{s.score}/10</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {GOVERNANCE_SCORE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {GOVERNANCE_SCORE_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="w-20" type="number" min={0} max={10} step={0.1} value={score} onChange={(e) => setScore(e.target.value)} />
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            onAction(`/api/admin/governance/pools/${poolId}/scores`, {
              category,
              score: Number(score),
            })
          }
        >
          Update score
        </Button>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-1 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-navy-400">{label}</p>
      <p className="font-semibold text-navy-900">{value}</p>
    </div>
  );
}

function ListSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some((c) => c != null);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold text-navy-900">{title}</h3>
      <ul className="mt-3 space-y-2">
        {!hasItems ? <li className="text-sm text-navy-500">{empty}</li> : children}
      </ul>
    </section>
  );
}
