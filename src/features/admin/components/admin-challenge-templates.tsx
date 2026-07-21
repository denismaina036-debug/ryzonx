"use client";

import { useMemo, useState } from "react";
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
  CHALLENGE_EVALUATION_CRITERIA_LABELS,
  CHALLENGE_TEMPLATE_STATUS,
  CHALLENGE_TRADING_RULE_LABELS,
  type ChallengeTemplate,
  type ChallengeTemplateStatus,
} from "@/domain/challenge/challenge-template";

interface AdminChallengeTemplatesProps {
  initialTemplates: ChallengeTemplate[];
}

export function AdminChallengeTemplates({ initialTemplates }: AdminChallengeTemplatesProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState(initialTemplates[0]?.id ?? "");
  const [draft, setDraft] = useState<ChallengeTemplate | null>(initialTemplates[0] ?? null);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [templates, selectedId]
  );

  function selectTemplate(id: string) {
    setSelectedId(id);
    const template = templates.find((item) => item.id === id) ?? null;
    setDraft(template ? { ...template } : null);
  }

  function patchDraft(partial: Partial<ChallengeTemplate>) {
    setDraft((prev) => (prev ? { ...prev, ...partial } : prev));
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/challenge-templates/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: {
            name: draft.name,
            status: draft.status,
            description: draft.description,
            startingBalance: draft.startingBalance,
            currency: draft.currency,
            platform: draft.platform,
            defaultBroker: draft.defaultBroker,
            profitTargetPct: draft.profitTargetPct,
            minTradingDays: draft.minTradingDays,
            maxEvaluationDays: draft.maxEvaluationDays,
            minClosedTrades: draft.minClosedTrades,
            maxOverallDrawdownPct: draft.maxOverallDrawdownPct,
            maxDailyDrawdownPct: draft.maxDailyDrawdownPct,
            maxRiskPerTradePct: draft.maxRiskPerTradePct,
            maxTotalExposurePct: draft.maxTotalExposurePct,
            maxSimultaneousPositions: draft.maxSimultaneousPositions,
            tradingRules: draft.tradingRules,
            tradeRequirements: draft.tradeRequirements,
            tradingJournal: draft.tradingJournal,
            evaluationCriteria: draft.evaluationCriteria,
            automaticFailureConditions: draft.automaticFailureConditions,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = data.template as ChallengeTemplate;
      setTemplates((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setDraft(updated);
      toast.success("Challenge template saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!draft || !selected) {
    return <p className="text-sm text-navy-500">No challenge templates found.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-2 lg:col-span-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => selectTemplate(template.id)}
            className={`w-full rounded-xl border p-4 text-left transition ${
              selectedId === template.id
                ? "border-royal-500/40 bg-royal-500/10"
                : "border-navy-100 bg-white hover:border-navy-200"
            }`}
          >
            <p className="font-medium text-navy-900">{template.name}</p>
            <p className="mt-1 text-xs capitalize text-navy-500">{template.status}</p>
            {template.isDefault && (
              <p className="mt-2 text-xs font-medium text-royal-600">Default template</p>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6 rounded-xl border border-navy-100 bg-white p-6 lg:col-span-3">
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-navy-900">Template Details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={draft.name} onChange={(e) => patchDraft({ name: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select
                value={draft.status}
                onValueChange={(value) => patchDraft({ status: value as ChallengeTemplateStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CHALLENGE_TEMPLATE_STATUS).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={draft.description ?? ""}
              onChange={(e) => patchDraft({ description: e.target.value })}
              rows={2}
            />
          </Field>
        </section>

        <section className="space-y-4 border-t border-navy-100 pt-6">
          <h2 className="text-base font-semibold text-navy-900">Account Details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Starting Balance">
              <Input
                type="number"
                value={draft.startingBalance}
                onChange={(e) => patchDraft({ startingBalance: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Currency">
              <Input value={draft.currency} onChange={(e) => patchDraft({ currency: e.target.value })} />
            </Field>
            <Field label="Platform">
              <Input value={draft.platform} onChange={(e) => patchDraft({ platform: e.target.value })} />
            </Field>
            <Field label="Default Broker">
              <Input
                value={draft.defaultBroker}
                onChange={(e) => patchDraft({ defaultBroker: e.target.value })}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-navy-100 pt-6">
          <h2 className="text-base font-semibold text-navy-900">Trading Objectives</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Profit Target (%)">
              <Input
                type="number"
                value={draft.profitTargetPct}
                onChange={(e) => patchDraft({ profitTargetPct: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Min Trading Days">
              <Input
                type="number"
                value={draft.minTradingDays}
                onChange={(e) => patchDraft({ minTradingDays: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Max Evaluation Days">
              <Input
                type="number"
                value={draft.maxEvaluationDays}
                onChange={(e) => patchDraft({ maxEvaluationDays: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Min Closed Trades">
              <Input
                type="number"
                value={draft.minClosedTrades}
                onChange={(e) => patchDraft({ minClosedTrades: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-navy-100 pt-6">
          <h2 className="text-base font-semibold text-navy-900">Risk Rules</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Max Overall Drawdown (%)">
              <Input
                type="number"
                value={draft.maxOverallDrawdownPct}
                onChange={(e) =>
                  patchDraft({ maxOverallDrawdownPct: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Max Daily Drawdown (%)">
              <Input
                type="number"
                value={draft.maxDailyDrawdownPct}
                onChange={(e) => patchDraft({ maxDailyDrawdownPct: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Max Risk Per Trade (%)">
              <Input
                type="number"
                value={draft.maxRiskPerTradePct}
                onChange={(e) => patchDraft({ maxRiskPerTradePct: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Max Total Exposure (%)">
              <Input
                type="number"
                value={draft.maxTotalExposurePct}
                onChange={(e) => patchDraft({ maxTotalExposurePct: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Max Simultaneous Positions">
              <Input
                type="number"
                value={draft.maxSimultaneousPositions}
                onChange={(e) =>
                  patchDraft({ maxSimultaneousPositions: Number(e.target.value) || 0 })
                }
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3 border-t border-navy-100 pt-6">
          <h2 className="text-base font-semibold text-navy-900">Evaluation Weights</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              Object.keys(CHALLENGE_EVALUATION_CRITERIA_LABELS) as Array<
                keyof typeof CHALLENGE_EVALUATION_CRITERIA_LABELS
              >
            ).map((key) => (
              <Field key={key} label={CHALLENGE_EVALUATION_CRITERIA_LABELS[key]}>
                <Input
                  type="number"
                  value={draft.evaluationCriteria[key]}
                  onChange={(e) =>
                    patchDraft({
                      evaluationCriteria: {
                        ...draft.evaluationCriteria,
                        [key]: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </Field>
            ))}
          </div>
        </section>

        <section className="space-y-3 border-t border-navy-100 pt-6">
          <h2 className="text-base font-semibold text-navy-900">Automatic Failure Conditions</h2>
          <Textarea
            value={draft.automaticFailureConditions.join("\n")}
            onChange={(e) =>
              patchDraft({
                automaticFailureConditions: e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
            rows={6}
          />
          <p className="text-xs text-navy-500">One condition per line.</p>
        </section>

        <section className="space-y-3 border-t border-navy-100 pt-6">
          <h2 className="text-base font-semibold text-navy-900">Trading Rules</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              Object.keys(CHALLENGE_TRADING_RULE_LABELS) as Array<
                keyof typeof CHALLENGE_TRADING_RULE_LABELS
              >
            ).map((key) => (
              <Field key={key} label={CHALLENGE_TRADING_RULE_LABELS[key]}>
                <Select
                  value={draft.tradingRules[key]}
                  onValueChange={(value) =>
                    patchDraft({
                      tradingRules: {
                        ...draft.tradingRules,
                        [key]: value as ChallengeTemplate["tradingRules"][typeof key],
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allowed">Allowed</SelectItem>
                    <SelectItem value="not_allowed">Not Allowed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ))}
          </div>
        </section>

        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save Template"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-navy-600">{label}</span>
      {children}
    </label>
  );
}
