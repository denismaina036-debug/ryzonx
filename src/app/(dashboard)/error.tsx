"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold text-navy-950">Something went wrong</h2>
      <p className="max-w-md text-sm text-navy-500">
        This page failed to load. If you see this after a code change, restart the dev
        server with <code className="rounded bg-surface-1 px-1.5 py-0.5">npm run dev:clean</code>.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
