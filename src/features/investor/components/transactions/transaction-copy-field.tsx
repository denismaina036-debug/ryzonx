"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TransactionCopyField({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex w-full items-start justify-between gap-3 rounded-lg border border-transparent px-0 py-0 text-left transition-colors hover:border-[var(--id-border)] hover:bg-[var(--id-surface-hover)] sm:px-3 sm:py-2"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--id-text-muted)]">{label}</p>
        <p
          className={cn(
            "mt-1 break-all text-sm text-[var(--id-text)]",
            mono && "font-mono"
          )}
        >
          {value}
        </p>
      </div>
      <span className="mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--id-text-muted)] opacity-70 transition-opacity group-hover:opacity-100">
        <Copy className="h-4 w-4" />
      </span>
    </button>
  );
}
