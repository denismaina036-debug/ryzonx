"use client";

import { Toaster } from "sonner";
import type { ReactNode } from "react";

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          classNames: {
            toast:
              "group rounded-xl border border-border bg-card shadow-lg font-sans",
            title: "text-navy-950 font-medium",
            description: "text-navy-500",
            success: "border-emerald-200 bg-emerald-50",
            error: "border-red-200 bg-red-50",
            warning: "border-gold-200 bg-gold-50",
          },
        }}
        richColors
        closeButton
      />
    </>
  );
}
