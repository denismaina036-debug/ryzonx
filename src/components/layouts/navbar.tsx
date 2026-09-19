"use client";
import { copyTradingText } from "@/lib/copy-trading-presentation";

import { useEffect, useRef, useState } from "react";
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
  { label: "Recent Strategy Trades", href: ROUTES.journal },
  { label: "Copiers", href: ROUTES.investors },
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
  const [mobileDrawerTop, setMobileDrawerTop] = useState(64);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const updateDrawerTop = () => {
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 64;
      setMobileDrawerTop(Math.max(0, Math.round(headerBottom)));
    };

    window.addEventListener("resize", updateDrawerTop, { passive: true });
    window.visualViewport?.addEventListener("resize", updateDrawerTop, { passive: true });

    return () => {
      window.removeEventListener("resize", updateDrawerTop);
      window.visualViewport?.removeEventListener("resize", updateDrawerTop);
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
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
              alt="RyvonX logo — copy-trading strategy marketplace"
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
                {copyTradingText(link.label)}
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
            onClick={() => {
              if (!mobileOpen) {
                const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 64;
                setMobileDrawerTop(Math.max(0, Math.round(headerBottom)));
              }
              setMobileOpen(!mobileOpen);
            }}
            className={cn("relative z-50 flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition active:scale-95 xl:hidden", isHome ? "border-white/15 bg-white/[.07] text-white" : "border-slate-200 bg-white")}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation-drawer"
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
              id="mobile-navigation-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 z-40 flex w-[min(320px,85vw)] flex-col overflow-hidden bg-background shadow-2xl xl:hidden"
              style={{
                top: mobileDrawerTop,
                height: `calc(100dvh - ${mobileDrawerTop}px)`,
              }}
            >
              <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-4 py-2 [scrollbar-gutter:stable]">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex min-h-[48px] items-center rounded-xl px-4 text-base font-medium transition-colors",
                        pathname === link.href
                          ? "bg-navy-900 text-white"
                          : "text-navy-700 hover:bg-surface-1"
                      )}
                    >
                      {copyTradingText(link.label)}
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="shrink-0 space-y-2.5 border-t border-border px-6 pt-4 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
                {isAuthenticated ? (
                  <Button asChild className="w-full" size="lg">
                      <Link href={ROUTES.dashboard} onClick={() => setMobileOpen(false)}>Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full" size="lg">
                      <Link href={ROUTES.login} onClick={() => setMobileOpen(false)}>Login</Link>
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
    </>
  );
}
