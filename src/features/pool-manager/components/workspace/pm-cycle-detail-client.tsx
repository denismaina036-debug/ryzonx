"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ROUTES } from "@/constants/routes";
import {
  INVESTMENT_CYCLE_MANAGER_TRANSITIONS,
  INVESTMENT_CYCLE_STATUS_LABELS,
} from "@/constants/investment-cycle";
import { isInvestmentCycleEditable } from "@/lib/investment/cycle-lifecycle";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { InvestmentAllocation, InvestmentCycle, Strategy } from "@/domain/investment/types";
import { PmPageHeader, PmSectionCard, PmFormMessage } from "./pm-page-header";
import { PmStatusBadge } from "./pm-status-badge";
import { PmCycleLifecycleTimeline } from "./pm-lifecycle-timeline";
import { PmFundingProgress } from "./pm-funding-progress";
import {
  PmCycleForm,
  cycleToFormValues,
  formValuesToCyclePayload,
  type CycleFormValues,
} from "./pm-cycle-form";
import { PmCycleFinancialPanel } from "./pm-cycle-financial-panel";
import {
  fetchCycleAllocations,
  submitCycle,
  transitionCycle,
  updateCycle,
} from "./pm-api";

const TRANSITION_LABELS: Record<string, string> = {
  funding: "Open Funding",
  trading: "Close Funding & Start Trading",
  archived: "Archive",
};

export function PmCycleDetailClient({
  initialCycle,
  strategy,
  strategies,
}: {
  initialCycle: InvestmentCycle;
  strategy: Strategy | null;
  strategies: Strategy[];
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState(initialCycle);
  const [values, setValues] = useState<CycleFormValues>(cycleToFormValues(cycle));
  const [allocations, setAllocations] = useState<InvestmentAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" } | null>(
    null
  );

  const editable = isInvestmentCycleEditable(cycle.status);
  const managerTransitions = INVESTMENT_CYCLE_MANAGER_TRANSITIONS[cycle.status] ?? [];

  useEffect(() => {
    void fetchCycleAllocations(cycle.id)
      .then(setAllocations)
      .catch(() => setAllocations([]));
  }, [cycle.id]);

  const runAction = useCallback(
    async (action: () => Promise<InvestmentCycle>, success: string) => {
      setLoading(true);
      setMessage(null);
      try {
        const next = await action();
        setCycle(next);
        setValues(cycleToFormValues(next));
        setMessage({ text: success, variant: "success" });
        router.refresh();
      } catch (err) {
        setMessage({
          text: err instanceof Error ? err.message : "Action failed",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  async function handleSave() {
    const { strategyId: _s, ...rest } = formValuesToCyclePayload(values);
    await runAction(() => updateCycle(cycle.id, rest), "Cycle saved");
  }

  const timeline = [
    { label: "Created", at: cycle.createdAt },
    { label: "Submitted", at: cycle.submittedAt },
    { label: "Approved", at: cycle.approvedAt },
    { label: "Funding opened", at: cycle.fundingStartedAt },
    { label: "Trading started", at: cycle.tradingStartedAt },
    { label: "Distribution", at: cycle.distributionStartedAt },
    { label: "Completed", at: cycle.completedAt },
    { label: "Archived", at: cycle.archivedAt },
  ].filter((t) => t.at);

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="Investment Cycle"
        title={cycle.name}
        description={cycle.description ?? "Fundraising and trading period"}
        actions={
          <PmStatusBadge
            label={INVESTMENT_CYCLE_STATUS_LABELS[cycle.status]}
            status={cycle.status}
          />
        }
      />

      <PmFormMessage message={message?.text ?? null} variant={message?.variant ?? "info"} />

      <div className="flex flex-wrap gap-2">
        {cycle.status === "draft" && (
          <Button
            disabled={loading}
            className="bg-amber-500 text-black hover:bg-amber-400"
            onClick={() => runAction(() => submitCycle(cycle.id), "Submitted for review")}
          >
            Submit for Review
          </Button>
        )}
        {editable && (
          <Button
            disabled={loading}
            variant="outline"
            className="border-white/10 text-white"
            onClick={handleSave}
          >
            Save Draft
          </Button>
        )}
        {managerTransitions
          .filter((t) => t !== "submitted" && t !== "draft")
          .map((status) => (
            <Button
              key={status}
              disabled={loading}
              variant="outline"
              className="border-white/10 text-white"
              onClick={() =>
                runAction(
                  () => transitionCycle(cycle.id, status),
                  TRANSITION_LABELS[status] ?? INVESTMENT_CYCLE_STATUS_LABELS[status]
                )
              }
            >
              {TRANSITION_LABELS[status] ?? INVESTMENT_CYCLE_STATUS_LABELS[status]}
            </Button>
          ))}
        {["trading", "distribution", "completed", "archived"].includes(cycle.status) && (
          <Button variant="outline" className="border-amber-500/30 text-amber-200" asChild>
            <Link href={`${ROUTES.poolManagerInvestmentCycles}/${cycle.id}/journal`}>
              Trading Journal
            </Link>
          </Button>
        )}
        {strategy && (
          <Button variant="ghost" className="text-navy-400" asChild>
            <Link href={`${ROUTES.poolManagerStrategies}/${strategy.id}`}>View Strategy</Link>
          </Button>
        )}
        <Button variant="ghost" className="text-navy-400" asChild>
          <Link href={ROUTES.poolManagerInvestmentCycles}>← Cycles</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {(cycle.status === "funding" || cycle.status === "approved") && (
            <PmSectionCard title="Funding Progress">
              <PmFundingProgress
                raised={cycle.raisedCapital}
                target={cycle.targetCapital}
                investorCount={cycle.investorCount}
              />
            </PmSectionCard>
          )}

          {["funding", "trading", "distribution", "completed"].includes(cycle.status) && (
            <PmCycleFinancialPanel cycleId={cycle.id} />
          )}

          <PmSectionCard title="Overview">
            <PmCycleForm
              cycleId={cycle.id}
              values={values}
              onChange={setValues}
              editable={editable}
              strategies={strategies}
              onAutosaved={setCycle}
            />
          </PmSectionCard>

          <PmSectionCard
            title="Current Allocations"
            description="Investor commitments recorded against this cycle"
          >
            {allocations.length === 0 ? (
              <p className="text-sm text-navy-500">No allocations yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wide text-navy-500">
                      <th className="pb-3 pr-4">Reference</th>
                      <th className="pb-3 pr-4">Amount</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((a) => (
                      <tr key={a.id} className="border-b border-white/[0.04]">
                        <td className="py-3 pr-4 font-mono text-xs text-navy-300">
                          {a.referenceNumber}
                        </td>
                        <td className="py-3 pr-4 text-white">{formatCurrency(a.amount)}</td>
                        <td className="py-3 pr-4 capitalize text-navy-400">{a.status}</td>
                        <td className="py-3 text-navy-500">
                          {new Date(a.allocatedAt).toLocaleDateString("en-GB")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PmSectionCard>
        </div>

        <aside className="space-y-6">
          <PmSectionCard title="Lifecycle">
            <PmCycleLifecycleTimeline currentStatus={cycle.status} />
          </PmSectionCard>

          <PmSectionCard title="Timeline">
            {timeline.length === 0 ? (
              <p className="text-sm text-navy-500">No lifecycle events recorded yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {timeline.map((t) => (
                  <li key={t.label} className="flex justify-between gap-3">
                    <span className="text-navy-500">{t.label}</span>
                    <span className="text-navy-300">
                      {new Date(t.at!).toLocaleString("en-GB")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PmSectionCard>

          <PmSectionCard title="Notes">
            <p className="text-sm text-navy-500">
              Cycle notes and administrative review comments will appear here in a future phase.
            </p>
          </PmSectionCard>

          <PmSectionCard title="History">
            <dl className="space-y-2 text-sm">
              <Row label="Target" value={cycle.targetCapital != null ? formatCurrency(cycle.targetCapital) : "—"} />
              <Row label="Min investment" value={cycle.minInvestment != null ? formatCurrency(cycle.minInvestment) : "—"} />
              <Row label="Duration" value={cycle.durationDays != null ? `${cycle.durationDays} days` : "—"} />
            </dl>
          </PmSectionCard>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-navy-500">{label}</dt>
      <dd className="text-navy-200">{value}</dd>
    </div>
  );
}
