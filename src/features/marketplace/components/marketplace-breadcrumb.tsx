import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

export interface MarketplaceBreadcrumbItem {
  label: string;
  href?: string;
}

export function MarketplaceBreadcrumb({
  items,
  className,
}: {
  items: MarketplaceBreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Marketplace navigation"
      className={cn("flex flex-wrap items-center gap-1 text-sm text-[var(--id-text-muted)]", className)}
    >
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-[var(--id-text)]">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--id-text-secondary)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function marketplaceHomeCrumb(): MarketplaceBreadcrumbItem {
  return { label: "Marketplace", href: ROUTES.marketplace };
}

export function managerProfileCrumb(slug: string, name: string): MarketplaceBreadcrumbItem {
  return { label: name, href: `${ROUTES.managerPublicProfile}/${slug}` };
}

export function opportunityCrumb(slug: string, name: string): MarketplaceBreadcrumbItem {
  return { label: name, href: `${ROUTES.marketplace}/${slug}` };
}
