import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { formatRelativeTime } from "@/lib/utils";
import { publicActivityService } from "@/services/public-activity.service";

export const metadata: Metadata = {
  title: "Platform Activity",
  description:
    "Live RyvonX marketplace activity — new pools, investments, and platform milestones. This is not personal transaction history.",
};

export default async function ActivityPage() {
  const items = await publicActivityService.listRecent(24);

  return (
    <SectionContainer className="!py-8 md:!py-12">
      <PageHeader
        title="Platform Activity"
        description="Live marketplace activity — new pools, investments, and milestones. For your personal deposits, withdrawals, and investments, visit your transaction history."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.transactions}>Personal Activity</Link>
          </Button>
        }
      />

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-1 px-6 py-12 text-center">
          <p className="text-sm text-navy-500">No recent platform activity yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-surface-1"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-950">{item.title}</p>
                  <p className="mt-1 text-sm text-navy-600">{item.summary}</p>
                </div>
                <p className="shrink-0 text-xs text-navy-500">
                  {formatRelativeTime(item.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm text-navy-500">
        Public activity is a live feed and does not replace your personal transaction history.
      </p>
    </SectionContainer>
  );
}
