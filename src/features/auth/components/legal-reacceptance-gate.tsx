"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PendingLegalAcceptance } from "@/domain/legal-documents/types";

const EXEMPT_PREFIXES = [
  "/login",
  "/register",
  "/terms",
  "/privacy",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth",
  "/admin/legal",
];

function isExemptPath(pathname: string): boolean {
  return EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function LegalReacceptanceGate({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingLegalAcceptance[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pathname, setPathname] = useState<string | null>(null);

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPending() {
      try {
        const response = await fetch("/api/legal/pending");
        if (response.status === 401) {
          if (!cancelled) setPending([]);
          return;
        }
        const payload = (await response.json()) as {
          pending?: PendingLegalAcceptance[];
        };
        if (!cancelled) setPending(payload.pending ?? []);
      } catch {
        if (!cancelled) setPending([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPending();
    return () => {
      cancelled = true;
    };
  }, []);

  const requiresAcceptance =
    !loading &&
    pending.length > 0 &&
    pathname !== null &&
    !isExemptPath(pathname) &&
    !pending.every((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  const allChecked =
    pending.length > 0 && pending.every((item) => checked[item.documentType]);

  async function handleAccept() {
    if (!allChecked) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/legal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionIds: pending.map((item) => item.versionId) }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to record acceptance");
      setPending([]);
      toast.success("Legal documents accepted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept documents");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {children}
      <Dialog open={requiresAcceptance} onOpenChange={() => undefined}>
        <DialogContent
          className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden [&>button.absolute]:hidden"
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Updated legal documents</DialogTitle>
            <DialogDescription>
              RyvonX has updated one or more legal documents. Please review and accept the
              latest versions before continuing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto py-1">
            {pending.map((item) => (
              <label key={item.documentType} className="flex items-start gap-3 rounded-xl border border-border p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={!!checked[item.documentType]}
                  onChange={(event) =>
                    setChecked((current) => ({
                      ...current,
                      [item.documentType]: event.target.checked,
                    }))
                  }
                />
                <span className="text-sm text-navy-700">
                  I have reviewed and accept the latest{" "}
                  <Link href={item.href} className="font-medium text-royal-600 hover:underline" target="_blank">
                    {item.label}
                  </Link>{" "}
                  (Version {item.versionNumber})
                </span>
              </label>
            ))}
          </div>

          <Button
            type="button"
            size="lg"
            className="mt-4 w-full shrink-0"
            disabled={!allChecked}
            isLoading={submitting}
            onClick={handleAccept}
          >
            Continue to RyvonX
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
