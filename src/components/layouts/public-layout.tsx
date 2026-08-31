import type { ReactNode } from "react";
import { Navbar } from "@/components/layouts/navbar";
import { Footer } from "@/components/layouts/footer";
import type { LandingContactInfo } from "@/domain/landing-page/types";

interface PublicLayoutProps {
  children: ReactNode;
  contact: LandingContactInfo;
  isAuthenticated?: boolean;
}

export function PublicLayout({
  children,
  contact,
  isAuthenticated = false,
}: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar isAuthenticated={isAuthenticated} />
      <main className="w-full min-w-0 flex-1 overflow-x-hidden">{children}</main>
      <Footer contact={contact} />
    </div>
  );
}
