"use client";

import { useEffect } from "react";

export function useIntervalRefresh(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let intervalId = 0;

    const run = () => {
      void callback();
    };

    const start = () => {
      window.clearInterval(intervalId);
      intervalId = window.setInterval(run, intervalMs);
    };

    const stop = () => {
      window.clearInterval(intervalId);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stop();
        return;
      }
      run();
      start();
    };

    run();
    start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [callback, intervalMs, enabled]);
}
