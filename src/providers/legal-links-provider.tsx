"use client";

import { createContext, useContext } from "react";
import type { LegalDocumentLink } from "@/domain/legal-documents/types";
import { DEFAULT_LANDING_PAGE_CONTENT } from "@/domain/landing-page/defaults";

const LegalLinksContext = createContext<LegalDocumentLink[]>([]);

export function LegalLinksProvider({
  links,
  children,
}: {
  links: LegalDocumentLink[];
  children: React.ReactNode;
}) {
  return (
    <LegalLinksContext.Provider value={links}>{children}</LegalLinksContext.Provider>
  );
}

export function useLegalLinks(): LegalDocumentLink[] {
  return useContext(LegalLinksContext);
}

export function useFooterLegalLinks(): Array<{ label: string; href: string }> {
  const links = useLegalLinks();
  if (links.length > 0) {
    return links.map((link) => ({ label: link.label, href: link.href }));
  }
  return DEFAULT_LANDING_PAGE_CONTENT.footer.legalLinks;
}
