import type { ReactNode } from "react";
import { Navbar } from "@/components/layouts/navbar";
import { Footer } from "@/components/layouts/footer";
import type { LandingContactInfo } from "@/domain/landing-page/types";
import type { LandingRiskWarning } from "@/domain/landing-page/types";
import { RiskWarning } from "@/features/public/components/risk-warning";

interface PublicLayoutProps {
  children: ReactNode;
  contact: LandingContactInfo;
  isAuthenticated?: boolean;
  riskWarning?: LandingRiskWarning;
  showRiskWarning?: boolean;
}

export function PublicLayout({
  children,
  contact,
  isAuthenticated = false,
  riskWarning,
  showRiskWarning = false,
}: PublicLayoutProps) {
  return (
    <div className="ryvonx-public flex min-h-screen flex-col">
      {showRiskWarning && riskWarning ? <RiskWarning warning={riskWarning} /> : null}
      <Navbar isAuthenticated={isAuthenticated} />
      <main className="w-full min-w-0 flex-1 overflow-x-hidden">{children}</main>
      <Footer contact={contact} />
    </div>
  );
}
