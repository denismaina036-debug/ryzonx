"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AdminSubNavItem {
  label: string;
  href: string;
  matchPrefix?: string;
  badge?: number;
}

export function AdminSubNav({ items }: { items: AdminSubNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border border-border bg-white p-1 shadow-sm">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.matchPrefix ? pathname.startsWith(item.matchPrefix) : false);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-royal-600 text-white shadow-sm"
                : "text-navy-600 hover:bg-navy-50 hover:text-navy-900"
            )}
          >
            {item.label}
            {item.badge != null && item.badge > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  isActive ? "bg-white/20 text-white" : "bg-gold-500 text-navy-950"
                )}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

interface AdminStatusNavProps {
  basePath: string;
  currentStatus: string;
  items: Array<{ label: string; status: string; count?: number }>;
}

export function AdminStatusNav({ basePath, currentStatus, items }: AdminStatusNavProps) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-border pb-3">
      {items.map((item) => {
        const href = `${basePath}/${item.status}`;
        const isActive = currentStatus === item.status;

        return (
          <Link
            key={item.status}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-navy-950 text-white"
                : "text-navy-500 hover:bg-navy-50 hover:text-navy-800"
            )}
          >
            {item.label}
            {item.count != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  isActive ? "bg-white/15 text-white" : "bg-navy-100 text-navy-600"
                )}
              >
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
