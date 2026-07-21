"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Server,
  Building2,
  KeyRound,
  Wallet,
  Target,
  ShieldAlert,
  CalendarDays,
  Monitor,
  Eye,
  EyeOff,
} from "lucide-react";
import type { ChallengeConfig, ChallengeEnrollmentRecord } from "@/domain/challenge/types";
import type { ChallengeTemplate } from "@/domain/challenge/challenge-template";

function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

interface ChallengeAccountCardProps {
  enrollment: ChallengeEnrollmentRecord;
  challenge: ChallengeConfig;
  template: ChallengeTemplate | null;
  currentTradingDay: number;
}

export function ChallengeAccountCard({
  enrollment,
  challenge,
  template,
  currentTradingDay,
}: ChallengeAccountCardProps) {
  const { account } = enrollment;
  const [showPassword, setShowPassword] = useState(false);
  const [showInvestorPassword, setShowInvestorPassword] = useState(false);
  const currency = template?.currency ?? challenge.currency ?? "USD";
  const platform = template?.platform ?? challenge.platform;

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
          icon={KeyRound}
          label="Password"
          value={
            account.password
              ? showPassword
                ? account.password
                : "••••••••"
              : null
          }
          action={
            account.password ? (
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-[var(--id-text-muted)] hover:text-[var(--id-text)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            ) : undefined
          }
        />
        {account.investorPassword && (
          <AccountItem
            icon={KeyRound}
            label="Investor Password"
            value={showInvestorPassword ? account.investorPassword : "••••••••"}
            action={
              <button
                type="button"
                onClick={() => setShowInvestorPassword((prev) => !prev)}
                className="text-[var(--id-text-muted)] hover:text-[var(--id-text)]"
                aria-label={showInvestorPassword ? "Hide investor password" : "Show investor password"}
              >
                {showInvestorPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />
        )}
        <AccountItem
          icon={Wallet}
          label="Starting Balance"
          value={formatCurrency(account.initialBalance, currency)}
        />
        {platform && <AccountItem icon={Monitor} label="Platform" value={platform} />}
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
  action,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--id-accent-soft)]">
        <Icon className="h-4 w-4 text-[var(--id-accent-text)]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--id-text-muted)]">
          {label}
        </dt>
        <dd className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-[var(--id-text)]">
          <span className="truncate">{value || "—"}</span>
          {action}
        </dd>
      </div>
    </div>
  );
}
