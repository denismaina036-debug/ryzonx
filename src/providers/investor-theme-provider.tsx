"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function InvestorThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="ryvonx-investor-theme"
      themes={["light", "dark"]}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
