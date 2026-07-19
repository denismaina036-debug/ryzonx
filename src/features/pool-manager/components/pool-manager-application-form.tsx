"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Shield } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";
import { PM_STATUS_LABELS } from "@/features/pool-manager/constants/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  investorCardClass,
  investorInputClass,
  investorPageSubtitleClass,
  investorPageTitleClass,
} from "@/features/investor/constants/ui";
import type { PoolManagerApplication, PoolManagerBasicInfo } from "@/domain/pool-manager/types";
import { PM_APPLICATION_STATUS, type PoolManagerApplicationStatus } from "@/domain/pool-manager/types";

interface PoolManagerApplicationFormProps {
  userRole: string;
  initialApplication: PoolManagerApplication | null;
}

const PENDING_STATUSES: ReadonlySet<PoolManagerApplicationStatus> = new Set([
  PM_APPLICATION_STATUS.PENDING,
  PM_APPLICATION_STATUS.UNDER_REVIEW,
  PM_APPLICATION_STATUS.INTERVIEW_REQUIRED,
]);

export function PoolManagerApplicationForm({
  userRole,
  initialApplication,
}: PoolManagerApplicationFormProps) {
  const router = useRouter();
  const [application, setApplication] = useState(initialApplication);
  const [basicInfo, setBasicInfo] = useState<PoolManagerBasicInfo>(
    initialApplication?.basicInfo ?? {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPoolManager = userRole === USER_ROLES.POOL_MANAGER;
  const isApproved = application?.status === PM_APPLICATION_STATUS.APPROVED;
  const isPending = application?.status != null && PENDING_STATUSES.has(application.status);
  const isRejected = application?.status === PM_APPLICATION_STATUS.REJECTED;
  const canEdit =
    !application ||
    application.status === PM_APPLICATION_STATUS.DRAFT ||
    application.status === PM_APPLICATION_STATUS.REQUIRES_CHANGES;

  const startApplication = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pool-manager/application", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApplication(data.application);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start application");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!application && !isPoolManager) {
      void startApplication();
    }
  }, [application, isPoolManager, startApplication]);

  async function submitApplication() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pool-manager/application/stage1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basicInfo, submit: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApplication(data.application);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  if (isPoolManager || isApproved) {
    return (
      <div className={`${investorCardClass} max-w-2xl p-8 text-center`}>
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className={`${investorPageTitleClass} mt-4`}>You&apos;re a Pool Manager</h1>
        <p className={`${investorPageSubtitleClass} mt-2`}>
          Your workspace is ready. Create strategies, investment cycles, and manage your pools.
        </p>
        <Button asChild className="mt-6">
          <Link href={ROUTES.poolManager}>Open Pool Manager Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className={`${investorCardClass} max-w-2xl p-8`}>
        <div className="flex items-start gap-4">
          <Clock className="mt-1 h-8 w-8 shrink-0 text-[var(--id-accent-text)]" />
          <div>
            <h1 className={investorPageTitleClass}>Application under review</h1>
            <p className={`${investorPageSubtitleClass} mt-2`}>
              Status: {PM_STATUS_LABELS[application!.status] ?? application!.status}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--id-text-secondary)]">
              Our team is reviewing your application. If a trader challenge is required, account
              details will appear below once provided by an administrator.
            </p>
            {application?.basicInfo.challengeAccountInfo && (
              <div className="mt-6 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)]/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                  Challenge account details
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--id-text)]">
                  {application.basicInfo.challengeAccountInfo}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className={`${investorCardClass} max-w-2xl p-8`}>
        <h1 className={investorPageTitleClass}>Application not approved</h1>
        <p className={`${investorPageSubtitleClass} mt-2`}>
          {application?.adminNotes ?? "Please contact support if you have questions."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--id-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--id-accent-text)]">
          <Shield className="h-3.5 w-3.5" />
          Pool Manager Application
        </div>
        <h1 className={investorPageTitleClass}>Become a Pool Manager</h1>
        <p className={investorPageSubtitleClass}>
          Submit one application form. After review, an administrator may provide challenge account
          details before final approval — no multi-step wizard required.
        </p>
      </header>

      <form
        className={`${investorCardClass} space-y-6 p-6 sm:p-8`}
        onSubmit={(e) => {
          e.preventDefault();
          void submitApplication();
        }}
      >
        {error && <p className="text-sm text-rose-600">{error}</p>}

        <Field label="Trading experience *">
          <Input
            className={investorInputClass}
            value={basicInfo.tradingExperience ?? ""}
            onChange={(e) => setBasicInfo({ ...basicInfo, tradingExperience: e.target.value })}
            placeholder="e.g. 5 years swing trading forex and indices"
            disabled={!canEdit || loading}
            required
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Years trading">
            <Input
              type="number"
              min={0}
              className={investorInputClass}
              value={basicInfo.yearsTrading ?? ""}
              onChange={(e) =>
                setBasicInfo({
                  ...basicInfo,
                  yearsTrading: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              disabled={!canEdit || loading}
            />
          </Field>
          <Field label="Country *">
            <Input
              className={investorInputClass}
              value={basicInfo.country ?? ""}
              onChange={(e) => setBasicInfo({ ...basicInfo, country: e.target.value })}
              disabled={!canEdit || loading}
              required
            />
          </Field>
        </div>

        <Field label="Trading style">
          <Input
            className={investorInputClass}
            value={basicInfo.tradingStyle ?? ""}
            onChange={(e) => setBasicInfo({ ...basicInfo, tradingStyle: e.target.value })}
            placeholder="e.g. Balanced, swing, low-frequency"
            disabled={!canEdit || loading}
          />
        </Field>

        <Field label="Biography *">
          <Textarea
            className={investorInputClass}
            rows={5}
            value={basicInfo.biography ?? ""}
            onChange={(e) => setBasicInfo({ ...basicInfo, biography: e.target.value })}
            placeholder="Tell investors about your experience, approach, and why you want to manage capital on RyvonX."
            disabled={!canEdit || loading}
            required
          />
        </Field>

        {canEdit && (
          <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
            {loading ? "Submitting…" : "Submit Application"}
          </Button>
        )}
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--id-text)]">{label}</span>
      {children}
    </label>
  );
}
