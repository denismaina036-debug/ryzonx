"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-8 shadow-[var(--id-shadow)]">
      <h1 className="text-xl font-semibold text-[var(--id-text)]">
        Could not load your dashboard
      </h1>
      <p className="text-sm leading-relaxed text-[var(--id-text-secondary)]">
        A temporary network or data error prevented the dashboard from loading. Your
        deposits, withdrawals, and wallet are unchanged — try refreshing this page.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.deposits}>Go to Deposits</Link>
        </Button>
      </div>
    </div>
  );
}
