"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  HelpCircle,
  KeyRound,
  MessageSquare,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  cryptoFlowInputClass,
  cryptoFlowPrimaryButtonClass,
} from "@/features/investor/components/crypto-flow/crypto-flow-step";
import { cn } from "@/lib/utils";
import type { SupportTicket } from "@/features/investor/types/account";

const ISSUE_CATEGORIES = [
  {
    id: "deposit",
    label: "Deposit",
    hint: "Funding, wallet address, or deposit status",
    icon: ArrowDownToLine,
  },
  {
    id: "withdrawals",
    label: "Withdrawals",
    hint: "Withdrawal requests and payout timing",
    icon: ArrowUpFromLine,
  },
  {
    id: "account_access",
    label: "Account Access",
    hint: "Login, password, or profile access",
    icon: KeyRound,
  },
  {
    id: "common",
    label: "Other Common Issues",
    hint: "Pools, marketplace, transactions, and more",
    icon: HelpCircle,
  },
  {
    id: "other",
    label: "Other",
    hint: "Specify your issue if it is not listed",
    icon: MessageSquare,
  },
] as const;

const COMMON_ISSUES = [
  { id: "pool", label: "Pool & Investments" },
  { id: "marketplace", label: "Marketplace & Managers" },
  { id: "transactions", label: "Transactions & History" },
  { id: "verification", label: "KYC / Verification" },
  { id: "notifications", label: "Notifications & Alerts" },
  { id: "settings", label: "Account Settings" },
] as const;

type IssueCategoryId = (typeof ISSUE_CATEGORIES)[number]["id"];
type CommonIssueId = (typeof COMMON_ISSUES)[number]["id"];

const cryptoFlowTextareaClass =
  "min-h-[120px] w-full resize-y rounded-md border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-3 text-sm text-[var(--id-text)] placeholder:text-[var(--id-text-faint)] focus-visible:border-[var(--id-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--id-accent-soft)]";

function buildSubject(
  category: IssueCategoryId | "",
  commonIssue: CommonIssueId | "",
  customIssue: string
): string {
  if (!category) return "";

  if (category === "other") return customIssue.trim();

  if (category === "common") {
    const match = COMMON_ISSUES.find((item) => item.id === commonIssue);
    return match?.label ?? "";
  }

  const match = ISSUE_CATEGORIES.find((item) => item.id === category);
  return match?.label ?? "";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    replied: "bg-[var(--id-success-soft)] text-[var(--id-success)]",
    closed: "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[status] ?? "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]"
      )}
    >
      {status}
    </span>
  );
}

export function InvestorSupportView({ tickets }: { tickets: SupportTicket[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<IssueCategoryId | "">("");
  const [commonIssue, setCommonIssue] = useState<CommonIssueId | "">("");
  const [customIssue, setCustomIssue] = useState("");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = tickets.find((t) => t.id === selectedId);

  const subject = useMemo(
    () => buildSubject(category, commonIssue, customIssue),
    [category, commonIssue, customIssue]
  );

  const canSubmit = useMemo(() => {
    if (!category || !message.trim()) return false;
    if (category === "common" && !commonIssue) return false;
    if (category === "other" && !customIssue.trim()) return false;
    return Boolean(subject);
  }, [category, commonIssue, customIssue, message, subject]);

  function resetForm() {
    setCategory("");
    setCommonIssue("");
    setCustomIssue("");
    setMessage("");
  }

  function selectCategory(next: IssueCategoryId) {
    setCategory(next);
    setCommonIssue("");
    setCustomIssue("");
  }

  async function createTicket() {
    if (!canSubmit) {
      toast.error("Complete all required fields before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/investor/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message: message.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed");

      toast.success("Ticket raised successfully", {
        description: "Our team will respond here and notify you.",
      });
      resetForm();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/investor/support/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed");
      setReply("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px]">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--id-text)] sm:text-[1.85rem]">
          Support
        </h1>
        <p className="mt-2 text-sm text-[var(--id-text-secondary)]">
          Choose your issue type, describe what happened, and our team will reply here.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow-lg)]">
            <div className="border-b border-[var(--id-border)] px-5 py-4">
              <h2 className="text-sm font-semibold text-[var(--id-text)]">Raise a ticket</h2>
              <p className="mt-1 text-xs text-[var(--id-text-muted)]">
                Select an issue category, then share details.
              </p>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                  What do you need help with?
                </p>
                <div className="grid gap-2">
                  {ISSUE_CATEGORIES.map((item) => {
                    const Icon = item.icon;
                    const active = category === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectCategory(item.id)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                          active
                            ? "border-[var(--id-accent)] bg-[var(--id-accent-soft)]"
                            : "border-[var(--id-border)] bg-[var(--id-surface-muted)] hover:border-[var(--id-border-strong)] hover:bg-[var(--id-surface-hover)]"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            active
                              ? "bg-[var(--id-accent)]/20 text-[var(--id-accent-text)]"
                              : "bg-[var(--id-surface-elevated)] text-[var(--id-text-muted)]"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[var(--id-text)]">
                            {item.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--id-text-muted)]">
                            {item.hint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {category === "common" && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                    Common issue
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_ISSUES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCommonIssue(item.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                          commonIssue === item.id
                            ? "border-[var(--id-accent)] bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"
                            : "border-[var(--id-border)] bg-[var(--id-surface-muted)] text-[var(--id-text-secondary)] hover:border-[var(--id-border-strong)]"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {category === "other" && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                    Specify your issue
                  </p>
                  <Input
                    value={customIssue}
                    onChange={(e) => setCustomIssue(e.target.value)}
                    placeholder="Brief title for your issue"
                    className={cryptoFlowInputClass}
                  />
                </div>
              )}

              {category && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                    Description
                  </p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe what happened and any relevant details…"
                    rows={5}
                    className={cryptoFlowTextareaClass}
                  />
                </div>
              )}

              <Button
                className={cn(cryptoFlowPrimaryButtonClass, "w-full sm:w-full")}
                disabled={submitting || !canSubmit}
                onClick={createTicket}
              >
                {submitting ? "Submitting…" : "Raise ticket"}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
            <div className="border-b border-[var(--id-border)] px-5 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                Your tickets
              </h3>
            </div>
            {tickets.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[var(--id-text-muted)]">No tickets yet.</p>
            ) : (
              <ul className="max-h-[320px] divide-y divide-[var(--id-border)] overflow-y-auto">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        "w-full px-5 py-3.5 text-left transition-colors",
                        selectedId === t.id
                          ? "bg-[var(--id-accent-soft)]"
                          : "hover:bg-[var(--id-surface-hover)]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-[var(--id-text)]">
                          {t.subject}
                        </p>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="mt-1 text-xs text-[var(--id-text-muted)]">
                        {new Date(t.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex min-h-[520px] flex-col overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow-lg)]">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--id-surface-muted)]">
                <MessageSquare className="h-6 w-6 text-[var(--id-text-muted)]" />
              </span>
              <p className="mt-4 text-sm font-medium text-[var(--id-text)]">
                Select a ticket or raise a new one
              </p>
              <p className="mt-1 max-w-sm text-sm text-[var(--id-text-muted)]">
                Your conversation history with our support team will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-[var(--id-border)] px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--id-text)]">
                      {selected.subject}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--id-text-muted)]">
                      Opened{" "}
                      {new Date(selected.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-6">
                {selected.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                      m.isAdmin
                        ? "ml-auto rounded-br-md bg-[var(--id-accent-soft)] text-[var(--id-text)]"
                        : "mr-auto rounded-bl-md border border-[var(--id-border)] bg-[var(--id-surface-muted)] text-[var(--id-text)]"
                    )}
                  >
                    <p className="mb-1.5 text-xs font-semibold text-[var(--id-text-muted)]">
                      {m.senderName}
                      <span className="ml-2 font-normal">
                        {new Date(m.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                    <p className="leading-relaxed">{m.body}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--id-border)] px-5 py-4 sm:px-6">
                <div className="flex gap-2">
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a reply…"
                    className={cn(cryptoFlowInputClass, "flex-1")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendReply();
                      }
                    }}
                  />
                  <Button
                    disabled={submitting || !reply.trim()}
                    onClick={sendReply}
                    className="h-11 shrink-0 rounded-xl px-4 [background:var(--id-accent-gradient)] text-white hover:opacity-95"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
