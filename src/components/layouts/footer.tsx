import Link from "next/link";
import Image from "next/image";
import { Linkedin, Twitter, Mail } from "lucide-react";
import { APP_NAME, ROUTES } from "@/constants/routes";

const QUICK_LINKS = [
  { label: "Performance", href: ROUTES.performance },
  { label: "Trading Journal", href: ROUTES.journal },
  { label: "Investors", href: ROUTES.investors },
  { label: "How It Works", href: ROUTES.howItWorks },
  { label: "FAQ", href: ROUTES.faq },
  { label: "Contact", href: ROUTES.contact },
] as const;

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-navy-950 text-navy-300">
      <div className="page-container py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/logo.png"
                alt={`${APP_NAME} logo`}
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
              <span className="text-lg font-semibold text-white">
                {APP_NAME}
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-navy-400">
              A transparent, professionally managed pool trading fund.
              Verify performance before you invest.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-navy-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-navy-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a
                href="mailto:hello@ryvonx.com"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-navy-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-navy-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Legal
            </h4>
            <ul className="mt-4 space-y-3">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-navy-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Contact
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-navy-400">
              <li>hello@ryvonx.com</li>
              <li>+1 (555) 000-0000</li>
              <li>
                100 Financial District
                <br />
                New York, NY 10005
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-xs text-navy-500">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p className="text-xs text-navy-500">
            Investing involves risk. Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </footer>
  );
}
