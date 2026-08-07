"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Megaphone, Bell, Headphones, Radio } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", href: ROUTES.adminCommunicationDashboard, icon: Radio },
  { label: "Messages", href: ROUTES.adminCommunicationMessages, icon: Mail },
  { label: "Campaigns", href: ROUTES.adminCommunicationCampaigns, icon: Megaphone },
  { label: "Notifications", href: ROUTES.adminCommunicationNotifications, icon: Bell },
  { label: "Support", href: ROUTES.adminCommunicationSupport, icon: Headphones },
] as const;

export function CommunicationCenterShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-royal-50/30 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-royal-600">
          Communication
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-950">{title}</h1>
            {description && <p className="mt-1 max-w-3xl text-sm text-navy-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card p-2">
        <nav className="flex min-w-max gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== ROUTES.adminCommunicationDashboard &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                  active
                    ? "bg-royal-600 text-white shadow-sm"
                    : "text-navy-600 hover:bg-navy-50"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
