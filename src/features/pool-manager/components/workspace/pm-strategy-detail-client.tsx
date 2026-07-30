"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Trash2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import type { Strategy } from "@/domain/investment/types";
import { PmPageHeader, PmSectionCard, PmFormMessage } from "./pm-page-header";
import { PmStatusBadge } from "./pm-status-badge";
import {
  PmStrategyForm,
  formValuesToPayload,
  strategyToFormValues,
  type StrategyFormValues,
} from "./pm-strategy-form";
import { deleteStrategy, submitStrategy, updateStrategy } from "./pm-api";
import { pmPrimaryButtonClass, pmSecondaryButtonClass } from "@/features/pool-manager/constants/ui";
import {
  simplifyStrategyStatus,
  strategyBadgeStatus,
} from "@/features/pool-manager/utils/pm-status-presentation";

export function PmStrategyDetailClient({ initialStrategy }: { initialStrategy: Strategy }) {
  const router = useRouter();
  const [strategy, setStrategy] = useState(initialStrategy);
  const [values, setValues] = useState<StrategyFormValues>(strategyToFormValues(strategy));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" } | null>(
    null
  );

  const editable = strategy.status !== "archived";
  const requiresAdminApproval = ["approved", "available", "operating", "paused"].includes(
    strategy.status
  );

  const runAction = useCallback(
    async (action: () => Promise<void>, success: string) => {
      setLoading(true);
      setMessage(null);
      try {
        await action();
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
    setLoading(true);
    setMessage(null);
    try {
      const next = await updateStrategy(strategy.id, formValuesToPayload(values));
      setStrategy(next);
      setValues(strategyToFormValues(next));
      setMessage({
        text: requiresAdminApproval
          ? "Changes submitted for RyvonX approval."
          : "Strategy saved.",
        variant: "success",
      });
      router.refresh();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Save failed",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete "${strategy.name}"?`);
    if (!confirmed) return;
    setLoading(true);
    setMessage(null);
    try {
      await deleteStrategy(strategy.id);
      router.push(ROUTES.poolManagerStrategies);
      router.refresh();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Delete failed",
        variant: "error",
      });
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="My Strategy"
        title={strategy.name}
        description="View and update your trading methodology."
        actions={
          <PmStatusBadge
            label={simplifyStrategyStatus(strategy.status)}
            status={strategyBadgeStatus(strategy.status)}
          />
        }
      />

      <PmFormMessage message={message?.text ?? null} variant={message?.variant ?? "info"} />

      <div className="flex flex-wrap gap-2">
        {strategy.status === "draft" && (
          <Button
            disabled={loading}
            className={pmPrimaryButtonClass}
            onClick={() =>
              runAction(async () => {
                const next = await submitStrategy(strategy.id);
                setStrategy(next);
                setValues(strategyToFormValues(next));
              }, "Submitted for review")
            }
          >
            Submit for Review
          </Button>
        )}
        {editable && (
          <Button
            disabled={loading}
            variant="outline"
            className={pmSecondaryButtonClass}
            onClick={() => void handleSave()}
          >
            Save Changes
          </Button>
        )}
        {editable && (
          <Button
            disabled={loading}
            variant="outline"
            className={pmSecondaryButtonClass}
            onClick={() => void handleDelete()}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        )}
        <Button variant="ghost" className="text-[var(--id-text-muted)]" asChild>
          <Link href={ROUTES.poolManagerStrategies}>← Back to strategies</Link>
        </Button>
      </div>

      {requiresAdminApproval && (
        <p className="text-sm text-[var(--id-text-muted)]">
          Approved strategies require RyvonX approval before changes go live.
        </p>
      )}

      <PmSectionCard title="Strategy Details">
        <PmStrategyForm
          strategyId={strategy.id}
          values={values}
          onChange={setValues}
          editable={editable}
          onAutosaved={setStrategy}
        />
      </PmSectionCard>
    </div>
  );
}
