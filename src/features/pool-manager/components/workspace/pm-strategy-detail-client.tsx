"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ROUTES } from "@/constants/routes";
import {
  STRATEGY_MANAGER_TRANSITIONS,
  STRATEGY_STATUS_LABELS,
} from "@/constants/strategy";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { isStrategyEditable } from "@/lib/investment/strategy-lifecycle";
import { Button } from "@/components/ui/button";
import type { InvestmentCycle, Strategy } from "@/domain/investment/types";
import { PmPageHeader, PmSectionCard, PmFormMessage } from "./pm-page-header";
import { PmStatusBadge } from "./pm-status-badge";
import { PmStrategyLifecycleTimeline } from "./pm-lifecycle-timeline";
import {
  PmStrategyForm,
  formValuesToPayload,
  strategyToFormValues,
  type StrategyFormValues,
} from "./pm-strategy-form";
import { submitStrategy, transitionStrategy, updateStrategy } from "./pm-api";

export function PmStrategyDetailClient({
  initialStrategy,
  initialCycles,
}: {
  initialStrategy: Strategy;
  initialCycles: InvestmentCycle[];
}) {
  const router = useRouter();
  const [strategy, setStrategy] = useState(initialStrategy);
  const [values, setValues] = useState<StrategyFormValues>(strategyToFormValues(strategy));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" } | null>(
    null
  );

  const editable = isStrategyEditable(strategy.status);
  const managerTransitions = STRATEGY_MANAGER_TRANSITIONS[strategy.status] ?? [];

  const runAction = useCallback(
    async (action: () => Promise<Strategy>, success: string) => {
      setLoading(true);
      setMessage(null);
      try {
        const next = await action();
        setStrategy(next);
        setValues(strategyToFormValues(next));
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
    await runAction(
      () => updateStrategy(strategy.id, formValuesToPayload(values)),
      "Strategy saved"
    );
  }

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="Strategy"
        title={strategy.name}
        description={strategy.description ?? "Professional investment methodology"}
        actions={
          <PmStatusBadge label={STRATEGY_STATUS_LABELS[strategy.status]} status={strategy.status} />
        }
      />

      <PmFormMessage
        message={message?.text ?? null}
        variant={message?.variant ?? "info"}
      />

      <div className="flex flex-wrap gap-2">
        {strategy.status === "draft" && (
          <Button
            disabled={loading}
            className="bg-amber-500 text-black hover:bg-amber-400"
            onClick={() => runAction(() => submitStrategy(strategy.id), "Submitted for review")}
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
              className="border-white/10 text-white capitalize"
              onClick={() =>
                runAction(
                  () => transitionStrategy(strategy.id, status),
                  `Status updated to ${STRATEGY_STATUS_LABELS[status]}`
                )
              }
            >
              {status === "archived" ? "Archive" : STRATEGY_STATUS_LABELS[status]}
            </Button>
          ))}
        <Button variant="ghost" className="text-navy-400" asChild>
          <Link href={ROUTES.poolManagerStrategies}>← Strategies</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PmSectionCard title="Overview">
            <PmStrategyForm
              strategyId={strategy.id}
              values={values}
              onChange={setValues}
              editable={editable}
              onAutosaved={setStrategy}
            />
          </PmSectionCard>

          <PmSectionCard title="Current Cycles" description={`${initialCycles.length} cycle(s) under this strategy`}>
            {initialCycles.length === 0 ? (
              <p className="text-sm text-navy-500">No investment cycles yet.</p>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {initialCycles.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3">
                    <Link
                      href={`${ROUTES.poolManagerInvestmentCycles}/${c.id}`}
                      className="text-sm font-medium text-white hover:text-amber-200"
                    >
                      {c.name}
                    </Link>
                    <PmStatusBadge
                      label={INVESTMENT_CYCLE_STATUS_LABELS[c.status]}
                      status={c.status}
                    />
                  </li>
                ))}
              </ul>
            )}
          </PmSectionCard>
        </div>

        <aside className="space-y-6">
          <PmSectionCard title="Lifecycle">
            <PmStrategyLifecycleTimeline currentStatus={strategy.status} />
          </PmSectionCard>

          <PmSectionCard title="Submission Status">
            <dl className="space-y-3 text-sm">
              <Row label="Status" value={STRATEGY_STATUS_LABELS[strategy.status]} />
              <Row
                label="Submitted"
                value={
                  strategy.submittedAt
                    ? new Date(strategy.submittedAt).toLocaleString("en-GB")
                    : "—"
                }
              />
              <Row
                label="Approved"
                value={
                  strategy.approvedAt
                    ? new Date(strategy.approvedAt).toLocaleString("en-GB")
                    : "—"
                }
              />
            </dl>
          </PmSectionCard>

          <PmSectionCard title="Review Timeline">
            <p className="text-sm text-navy-500">
              Administrative review notes will appear here once RyvonX completes strategy review.
            </p>
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
      <dd className="text-right text-navy-200">{value}</dd>
    </div>
  );
}
