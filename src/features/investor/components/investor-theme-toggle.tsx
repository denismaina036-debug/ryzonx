"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function InvestorThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-9 w-[4.5rem] rounded-full bg-[var(--id-surface-muted)]",
          className
        )}
      />
    );
  }

  const isDark = (resolvedTheme ?? theme) === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative flex h-9 w-[4.5rem] items-center rounded-full border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-1 transition-colors",
        className
      )}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span
        className={cn(
          "absolute h-7 w-7 rounded-full bg-[var(--id-accent)] shadow-sm transition-transform duration-200",
          isDark ? "translate-x-0" : "translate-x-[2rem]"
        )}
      />
      <Sun
        className={cn(
          "relative z-10 ml-1.5 h-3.5 w-3.5 transition-colors",
          isDark ? "text-[var(--id-text-faint)]" : "text-white"
        )}
        strokeWidth={1.75}
      />
      <Moon
        className={cn(
          "relative z-10 ml-auto mr-1.5 h-3.5 w-3.5 transition-colors",
          isDark ? "text-white" : "text-[var(--id-text-faint)]"
        )}
        strokeWidth={1.75}
      />
    </button>
  );
}
