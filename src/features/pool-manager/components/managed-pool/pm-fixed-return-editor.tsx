"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FixedReturnRow } from "@/domain/pools/fixed-return";
import { formatFixedReturnRowLabel } from "@/domain/pools/fixed-return";
import { pmInputClass } from "@/features/pool-manager/constants/ui";

interface PmFixedReturnEditorProps {
  rows: FixedReturnRow[];
  onChange: (rows: FixedReturnRow[]) => void;
  disabled?: boolean;
}

export function PmFixedReturnEditor({ rows, onChange, disabled }: PmFixedReturnEditorProps) {
  function updateRow(index: number, patch: Partial<FixedReturnRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const last = rows[rows.length - 1];
    const nextInvestment = last ? last.investmentAmount + 500 : 100;
    onChange([
      ...rows,
      { investmentAmount: nextInvestment, fixedReturnAmount: nextInvestment + 50 },
    ]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div className="rounded-lg border border-border bg-[var(--id-surface-muted)]/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--id-text)]">Fixed Return Schedule</p>
        <Button type="button" size="sm" variant="outline" onClick={addRow} disabled={disabled}>
          <Plus className="h-3.5 w-3.5" />
          Add row
        </Button>
      </div>
      <p className="mb-4 text-xs text-[var(--id-text-muted)]">
        Map each investment amount to the total amount the investor receives at settlement. No
        percentages or profit splits apply to Fixed Return.
      </p>

      <div className="mb-2 hidden gap-2 text-xs font-medium uppercase tracking-wide text-[var(--id-text-muted)] sm:grid sm:grid-cols-[1fr_1fr_auto]">
        <span>Investment Amount</span>
        <span>Investor Receives</span>
        <span className="w-10" />
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="space-y-1">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                type="number"
                placeholder="Investment Amount ($)"
                value={row.investmentAmount || ""}
                disabled={disabled}
                min={1}
                onChange={(e) =>
                  updateRow(index, { investmentAmount: Number(e.target.value) || 0 })
                }
                className={pmInputClass}
              />
              <Input
                type="number"
                placeholder="Investor Receives ($)"
                value={row.fixedReturnAmount || ""}
                disabled={disabled}
                min={1}
                onChange={(e) =>
                  updateRow(index, { fixedReturnAmount: Number(e.target.value) || 0 })
                }
                className={pmInputClass}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || rows.length <= 1}
                onClick={() => removeRow(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {row.investmentAmount > 0 &&
              row.fixedReturnAmount > row.investmentAmount && (
                <p className="text-xs font-medium text-[var(--id-accent-text)]">
                  {formatFixedReturnRowLabel(row)}
                </p>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
