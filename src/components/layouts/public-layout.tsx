import type { ReactNode } from "react";
import { Navbar } from "@/components/layouts/navbar";
import { Footer } from "@/components/layouts/footer";

interface PublicLayoutProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export function PublicLayout({
  children,
  isAuthenticated = false,
}: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar isAuthenticated={isAuthenticated} />
      <main className="w-full min-w-0 flex-1 overflow-x-hidden">{children}</main>
      <Footer />
    </div>
  );
}
