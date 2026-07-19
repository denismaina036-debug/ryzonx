"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  Activity,
  ListChecks,
  Webhook,
  Inbox,
  Bell,
  RefreshCw,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Automation Center", href: ROUTES.adminAutomation, icon: Zap },
  { label: "Event Explorer", href: ROUTES.adminAutomationEvents, icon: Activity },
  { label: "Automation Rules", href: ROUTES.adminAutomationRules, icon: ListChecks },
  { label: "Webhooks", href: ROUTES.adminAutomationWebhooks, icon: Webhook },
  { label: "Queue Monitor", href: ROUTES.adminAutomationQueue, icon: Inbox },
  { label: "Notifications", href: ROUTES.adminAutomationNotifications, icon: Bell },
] as const;

export function AutomationCenterShell({
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
      <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-violet-50/30 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">
          Platform Automation
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
              (item.href !== ROUTES.adminAutomation && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                  active
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-navy-600 hover:bg-muted hover:text-navy-900"
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

export function ProcessQueuesButton({ onComplete }: { onComplete?: () => void }) {
  async function processQueues() {
    const res = await fetch("/api/admin/automation/process-queues", { method: "POST" });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      throw new Error(json.error ?? "Queue processing failed");
    }
    onComplete?.();
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-navy-700 shadow-sm hover:bg-muted"
      onClick={() => void processQueues().catch(console.error)}
    >
      <RefreshCw className="h-3.5 w-3.5" />
      Process Queues
    </button>
  );
}
