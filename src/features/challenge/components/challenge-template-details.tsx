import type { ChallengeTemplate } from "@/domain/challenge/challenge-template";
import {
  CHALLENGE_EVALUATION_CRITERIA_LABELS,
  CHALLENGE_TRADING_RULE_LABELS,
} from "@/domain/challenge/challenge-template";

function formatPct(value: number): string {
  return `${value}%`;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRule(value: string): string {
  return value === "allowed" ? "Allowed" : "Not Allowed";
}

interface ChallengeTemplateDetailsProps {
  template: ChallengeTemplate;
}

export function ChallengeTemplateDetails({ template }: ChallengeTemplateDetailsProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-6">
        <h3 className="text-sm font-semibold text-[var(--id-text)]">{template.name}</h3>
        {template.description && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--id-text-secondary)]">
            {template.description}
          </p>
        )}
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem
            label="Starting Balance"
            value={formatCurrency(template.startingBalance, template.currency)}
          />
          <DetailItem label="Platform" value={template.platform} />
          <DetailItem label="Default Broker" value={template.defaultBroker} />
        </dl>
      </section>

      <section className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-6">
        <h3 className="text-sm font-semibold text-[var(--id-text)]">Trading Objectives</h3>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Profit Target" value={formatPct(template.profitTargetPct)} />
          <DetailItem label="Min Trading Days" value={String(template.minTradingDays)} />
          <DetailItem label="Max Evaluation Period" value={`${template.maxEvaluationDays} days`} />
          <DetailItem label="Min Closed Trades" value={String(template.minClosedTrades)} />
        </dl>
      </section>

      <section className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-6">
        <h3 className="text-sm font-semibold text-[var(--id-text)]">Risk Rules</h3>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Max Overall Drawdown" value={formatPct(template.maxOverallDrawdownPct)} />
          <DetailItem label="Max Daily Drawdown" value={formatPct(template.maxDailyDrawdownPct)} />
          <DetailItem label="Max Risk Per Trade" value={formatPct(template.maxRiskPerTradePct)} />
          <DetailItem label="Max Total Exposure" value={formatPct(template.maxTotalExposurePct)} />
          <DetailItem
            label="Max Simultaneous Positions"
            value={String(template.maxSimultaneousPositions)}
          />
        </dl>
      </section>

      <section className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-6">
        <h3 className="text-sm font-semibold text-[var(--id-text)]">Trading Rules</h3>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            Object.keys(CHALLENGE_TRADING_RULE_LABELS) as Array<
              keyof typeof CHALLENGE_TRADING_RULE_LABELS
            >
          ).map((key) => (
            <DetailItem
              key={key}
              label={CHALLENGE_TRADING_RULE_LABELS[key]}
              value={formatRule(template.tradingRules[key])}
            />
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-6">
        <h3 className="text-sm font-semibold text-[var(--id-text)]">Trade Requirements</h3>
        <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-[var(--id-text-secondary)]">
          {template.tradeRequirements.requireStopLoss && <li>Every trade must include a Stop Loss</li>}
          {template.tradeRequirements.requireTakeProfit && (
            <li>Every trade must include a Take Profit</li>
          )}
          {template.tradeRequirements.strategyNote && (
            <li className="list-none pt-2">{template.tradeRequirements.strategyNote}</li>
          )}
        </ul>
      </section>

      {template.tradingJournal.required && (
        <section className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-6">
          <h3 className="text-sm font-semibold text-[var(--id-text)]">Trading Journal</h3>
          <p className="mt-2 text-sm text-[var(--id-text-secondary)]">
            Every completed trade must be recorded in the Trading Journal with:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[var(--id-text-secondary)]">
            {template.tradingJournal.fields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-6">
        <h3 className="text-sm font-semibold text-[var(--id-text)]">Evaluation Criteria</h3>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            Object.keys(CHALLENGE_EVALUATION_CRITERIA_LABELS) as Array<
              keyof typeof CHALLENGE_EVALUATION_CRITERIA_LABELS
            >
          ).map((key) => (
            <DetailItem
              key={key}
              label={CHALLENGE_EVALUATION_CRITERIA_LABELS[key]}
              value={formatPct(template.evaluationCriteria[key])}
            />
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-6">
        <h3 className="text-sm font-semibold text-[var(--id-text)]">Automatic Failure Conditions</h3>
        <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-[var(--id-text-secondary)]">
          {template.automaticFailureConditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--id-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-[var(--id-text)]">{value}</dd>
    </div>
  );
}
