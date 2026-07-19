"use client";

import type { LucideIcon } from "lucide-react";
import { Server, Building2, KeyRound, Wallet, Target, ShieldAlert, CalendarDays } from "lucide-react";
import type { ChallengeConfig, ChallengeEnrollmentRecord } from "@/domain/challenge/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

interface ChallengeAccountCardProps {
  enrollment: ChallengeEnrollmentRecord;
  challenge: ChallengeConfig;
  currentTradingDay: number;
}

export function ChallengeAccountCard({
  enrollment,
  challenge,
  currentTradingDay,
}: ChallengeAccountCardProps) {
  const { account } = enrollment;

  return (
    <div className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-6">
      <h3 className="text-sm font-semibold text-[var(--id-text)]">Challenge Account</h3>
      <p className="mt-1 text-xs text-[var(--id-text-muted)]">
        Credentials provided by the RyvonX administration team
      </p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <AccountItem icon={Building2} label="Broker" value={account.broker} />
        <AccountItem icon={Server} label="Server" value={account.server} />
        <AccountItem icon={KeyRound} label="Login" value={account.login} />
        <AccountItem
          icon={Wallet}
          label="Challenge Balance"
          value={formatCurrency(account.initialBalance)}
        />
        <AccountItem
          icon={Target}
          label="Profit Target"
          value={`${challenge.profitTargetPct}%`}
        />
        <AccountItem
          icon={ShieldAlert}
          label="Max Drawdown"
          value={`${challenge.maxOverallLossPct}%`}
        />
        <AccountItem
          icon={CalendarDays}
          label="Min Trading Days"
          value={String(challenge.minTradingDays)}
        />
        <AccountItem
          icon={CalendarDays}
          label="Current Trading Day"
          value={String(currentTradingDay)}
        />
      </dl>

      {account.notes && (
        <div className="mt-5 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-elevated)] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--id-text-muted)]">
            Additional Notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--id-text-secondary)]">
            {account.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function AccountItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--id-accent-soft)]">
        <Icon className="h-4 w-4 text-[var(--id-accent-text)]" strokeWidth={1.75} />
      </div>
      <div>
        <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--id-text-muted)]">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm font-semibold text-[var(--id-text)]">
          {value || "—"}
        </dd>
      </div>
    </div>
  );
}
