"use client";

import { formatCurrency } from "@/lib/utils";
import type { InvestorFinancialView } from "@/domain/financial/types";

export function InvestorFinancialPanel({ financial }: { financial: InvestorFinancialView }) {
  const { wallet } = financial;

  return (
    <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
      <div className="border-b border-[var(--id-border)] px-5 py-4">
        <h2 className="text-sm font-semibold text-[var(--id-text)]">Financial Overview</h2>
        <p className="text-xs text-[var(--id-text-muted)]">
          Settlement status and reserved funds — derived from platform accounting.
        </p>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-4">
        <Metric label="Available" value={formatCurrency(wallet.available)} />
        <Metric label="Reserved" value={formatCurrency(wallet.reserved)} />
        <Metric label="Pending" value={formatCurrency(wallet.pending)} />
        <Metric label="Settled" value={formatCurrency(wallet.settled)} />
      </div>

      {financial.distributionStatus.length > 0 && (
        <div className="border-t border-[var(--id-border)] px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
            Distribution Status
          </h3>
          <ul className="mt-2 space-y-2">
            {financial.distributionStatus.map((d, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span>{d.cycleName}</span>
                <span className="text-[var(--id-text-muted)]">
                  {d.status} · {formatCurrency(d.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {financial.timeline.length > 0 && (
        <div className="border-t border-[var(--id-border)] px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
            Financial Timeline
          </h3>
          <ul className="mt-2 space-y-2">
            {financial.timeline.slice(0, 8).map((event, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span>{event.label}</span>
                <span className="text-[var(--id-text-muted)]">
                  {event.amount != null ? formatCurrency(event.amount) : ""}{" "}
                  {new Date(event.occurredAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--id-text-muted)]">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-[var(--id-text)]">{value}</p>
    </div>
  );
}
