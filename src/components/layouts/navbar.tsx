"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAME, ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: ROUTES.home },
  { label: "Marketplace", href: ROUTES.marketplace },
  { label: "Performance", href: ROUTES.performance },
  { label: "Trading Journal", href: ROUTES.journal },
  { label: "Investors", href: ROUTES.investors },
  { label: "How It Works", href: ROUTES.howItWorks },
  { label: "FAQ", href: ROUTES.faq },
  { label: "Contact", href: ROUTES.contact },
] as const;

interface NavbarProps {
  isAuthenticated?: boolean;
}

export function Navbar({ isAuthenticated = false }: NavbarProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "border-b border-border/60 bg-background/80 shadow-sm backdrop-blur-xl"
            : "bg-transparent"
        )}
      >
        <div className="page-container flex h-16 items-center justify-between lg:h-18">
          <Link href={ROUTES.home} className="relative z-50 flex items-center gap-2.5">
            <Image
              src="/images/logo.png"
              alt={`${APP_NAME} logo`}
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
            <span className="text-lg font-semibold tracking-tight text-navy-950">
              {APP_NAME}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "text-navy-950"
                    : "text-navy-500 hover:text-navy-900"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            {isAuthenticated ? (
              <Button asChild size="sm">
                <Link href={ROUTES.dashboard}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href={ROUTES.login}>Login</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={ROUTES.register}>Join Pool</Link>
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="relative z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card xl:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-navy-950/20 backdrop-blur-sm xl:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-40 flex h-full w-[min(320px,85vw)] flex-col bg-background shadow-2xl xl:hidden"
            >
              <div className="flex h-16 items-center justify-end px-6" />
              <nav className="flex flex-1 flex-col gap-1 px-4">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      className={cn(
                        "flex min-h-[48px] items-center rounded-xl px-4 text-base font-medium transition-colors",
                        pathname === link.href
                          ? "bg-navy-900 text-white"
                          : "text-navy-700 hover:bg-surface-1"
                      )}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="space-y-3 border-t border-border p-6">
                {isAuthenticated ? (
                  <Button asChild className="w-full" size="lg">
                    <Link href={ROUTES.dashboard}>Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full" size="lg">
                      <Link href={ROUTES.login}>Login</Link>
                    </Button>
                    <Button asChild className="w-full" size="lg">
                      <Link href={ROUTES.register}>Join Pool</Link>
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="h-16 lg:h-18" />
    </>
  );
}
