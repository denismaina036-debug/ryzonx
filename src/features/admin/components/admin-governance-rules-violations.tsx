"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RULE_TYPE_LABELS,
  VIOLATION_STATUS_LABELS,
} from "@/constants/governance";
import type { GovernanceRule, GovernanceViolation } from "@/domain/governance/types";

export function AdminGovernanceRules({ rules }: { rules: GovernanceRule[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const platformRules = rules.filter((r) => !r.fundId);

  async function toggleRule(rule: GovernanceRule) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/governance/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Rule updated");
      router.refresh();
    } catch {
      toast.error("Failed to update rule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-navy-500">
            <th className="p-4">Rule</th>
            <th className="p-4">Type</th>
            <th className="p-4">Threshold</th>
            <th className="p-4">Severity</th>
            <th className="p-4">Scope</th>
            <th className="p-4">Active</th>
          </tr>
        </thead>
        <tbody>
          {platformRules.map((rule) => (
            <tr key={rule.id} className="border-b border-border/50">
              <td className="p-4">
                <p className="font-medium text-navy-800">{rule.ruleName}</p>
                {rule.description && (
                  <p className="text-xs text-navy-500">{rule.description}</p>
                )}
              </td>
              <td className="p-4">{RULE_TYPE_LABELS[rule.ruleType] ?? rule.ruleType}</td>
              <td className="p-4">
                {rule.thresholdValue != null
                  ? `${rule.thresholdValue}${rule.thresholdUnit ? ` ${rule.thresholdUnit}` : ""}`
                  : "—"}
              </td>
              <td className="p-4 capitalize">{rule.defaultSeverity}</td>
              <td className="p-4">{rule.fundName ?? "Platform default"}</td>
              <td className="p-4">
                <Button
                  size="sm"
                  variant={rule.isActive ? "default" : "outline"}
                  disabled={saving}
                  onClick={() => toggleRule(rule)}
                >
                  {rule.isActive ? "Active" : "Inactive"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminGovernanceViolations({
  violations,
  pools,
}: {
  violations: GovernanceViolation[];
  pools: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [fundId, setFundId] = useState(pools[0]?.id ?? "");
  const [ruleKey, setRuleKey] = useState("max_daily_drawdown");
  const [actual, setActual] = useState("");
  const [expected, setExpected] = useState("5");

  async function recordViolation() {
    if (!fundId) return;
    try {
      const res = await fetch(`/api/admin/governance/pools/${fundId}/violations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleKey,
          ruleName: RULE_TYPE_LABELS[ruleKey],
          actualValue: actual ? Number(actual) : null,
          expectedValue: expected ? Number(expected) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Violation recorded");
      router.refresh();
    } catch {
      toast.error("Failed to record violation");
    }
  }

  async function resolveViolation(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/governance/violations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Violation updated");
      router.refresh();
    } catch {
      toast.error("Update failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-navy-500">Pool</label>
          <Select value={fundId} onValueChange={setFundId}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {pools.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-navy-500">Rule</label>
          <Select value={ruleKey} onValueChange={setRuleKey}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input className="w-24" placeholder="Actual" value={actual} onChange={(e) => setActual(e.target.value)} />
        <Input className="w-24" placeholder="Expected" value={expected} onChange={(e) => setExpected(e.target.value)} />
        <Button onClick={recordViolation}>Record violation</Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-navy-500">
              <th className="p-4">Pool</th>
              <th className="p-4">Rule</th>
              <th className="p-4">Actual / Expected</th>
              <th className="p-4">Severity</th>
              <th className="p-4">Status</th>
              <th className="p-4">Date</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {violations.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-navy-500">
                  No violations recorded.
                </td>
              </tr>
            ) : (
              violations.map((v) => (
                <tr key={v.id} className="border-b border-border/50">
                  <td className="p-4 font-medium">{v.fundName}</td>
                  <td className="p-4">{v.ruleName}</td>
                  <td className="p-4">
                    {v.actualValue ?? "—"} / {v.expectedValue ?? "—"}
                  </td>
                  <td className="p-4 capitalize">{v.severity}</td>
                  <td className="p-4">{VIOLATION_STATUS_LABELS[v.status] ?? v.status}</td>
                  <td className="p-4 text-xs">{new Date(v.violationAt).toLocaleString()}</td>
                  <td className="p-4">
                    {v.status === "open" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => resolveViolation(v.id, "resolved")}>
                          Resolve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => resolveViolation(v.id, "dismissed")}>
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
