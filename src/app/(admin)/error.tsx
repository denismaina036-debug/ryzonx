"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold text-navy-950">Something went wrong</h2>
      <p className="max-w-md text-sm text-navy-500">
        The admin page failed to load. If you just updated code, stop the dev server,
        run <code className="rounded bg-surface-1 px-1.5 py-0.5">npm run dev:clean</code>,
        then try again.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
