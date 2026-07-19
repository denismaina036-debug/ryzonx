"use client";

import { useEffect, useRef } from "react";

export function usePmAutosave<T>(
  value: T,
  onSave: (value: T) => Promise<void>,
  enabled: boolean,
  delayMs = 1200
) {
  const isFirst = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void onSave(value);
    }, delayMs);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, enabled, delayMs, onSave]);
}
