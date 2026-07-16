"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function InvestorThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="ryvonx-investor-theme"
      themes={["dark", "light"]}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
