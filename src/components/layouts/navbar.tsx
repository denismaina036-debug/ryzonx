"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAME, ROUTES } from "@/constants/routes";
import { GetStartedModal } from "@/features/public/components/get-started-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: ROUTES.home },
  { label: "Marketplace", href: ROUTES.marketplace },
  { label: "Performance", href: ROUTES.performance },
  { label: "Recent Pool Trades", href: ROUTES.journal },
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
  const isHome = pathname === ROUTES.home;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [getStartedOpen, setGetStartedOpen] = useState(false);

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
          isHome
            ? scrolled
              ? "border-b border-white/10 bg-[#040d1c]/92 shadow-[0_8px_30px_rgba(0,0,0,.24)] backdrop-blur-xl"
              : "border-b border-white/10 bg-[#040d1c]/88 backdrop-blur-xl"
            : scrolled
              ? "border-b border-slate-200/70 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,.06)] backdrop-blur-xl"
              : "border-b border-slate-200/50 bg-white/80 backdrop-blur-xl"
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-[96rem] items-center justify-between px-5 sm:px-7 lg:h-18 lg:px-10 xl:px-12">
          <Link href={ROUTES.home} className="relative z-50 flex items-center gap-2.5 rounded-xl outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-blue-500">
            <Image
              src="/images/logo-transparent.png"
              alt="RyvonX logo — investment pool marketplace"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
            <span className={cn("text-lg font-semibold tracking-tight", isHome ? "text-white" : "text-navy-950")}>
              {APP_NAME}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-slate-100/80",
                  pathname === link.href
                    ? isHome
                      ? "text-white after:absolute after:-bottom-[13px] after:left-1/2 after:h-0.5 after:w-8 after:-translate-x-1/2 after:rounded-full after:bg-gradient-to-r after:from-blue-500 after:to-indigo-400"
                      : "text-navy-950"
                    : isHome ? "text-slate-300 hover:bg-white/[.06] hover:text-white" : "text-navy-500 hover:text-navy-900"
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
                <Button asChild variant="ghost" size="sm" className={isHome ? "text-slate-200 hover:bg-white/[.07] hover:text-white" : undefined}>
                  <Link href={ROUTES.login}>Login</Link>
                </Button>
                <Button type="button" size="sm" className={isHome ? "bg-blue-500 text-white shadow-lg shadow-blue-950/30 hover:bg-blue-400" : undefined} onClick={() => setGetStartedOpen(true)}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn("relative z-50 flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition active:scale-95 xl:hidden", isHome ? "border-white/15 bg-white/[.07] text-white" : "border-slate-200 bg-white")}
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
                    <Button
                      type="button"
                      className="w-full"
                      size="lg"
                      onClick={() => {
                        setMobileOpen(false);
                        setGetStartedOpen(true);
                      }}
                    >
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <GetStartedModal open={getStartedOpen} onOpenChange={setGetStartedOpen} />

      <div className={cn("h-16 lg:h-18", isHome && "bg-[#06142d]")} />
    </>
  );
}
