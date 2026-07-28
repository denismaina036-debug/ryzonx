"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicLandingPageContent } from "@/domain/landing-page/types";

const LandingContentContext = createContext<PublicLandingPageContent | null>(null);

export function LandingContentProvider({
  content,
  children,
}: {
  content: PublicLandingPageContent;
  children: ReactNode;
}) {
  return (
    <LandingContentContext.Provider value={content}>
      {children}
    </LandingContentContext.Provider>
  );
}

export function useLandingContent(): PublicLandingPageContent {
  const ctx = useContext(LandingContentContext);
  if (!ctx) {
    throw new Error("useLandingContent must be used within LandingContentProvider");
  }
  return ctx;
}

export function useOptionalLandingContent(): PublicLandingPageContent | null {
  return useContext(LandingContentContext);
}
