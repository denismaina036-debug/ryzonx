import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PlatformActivityFeed } from "@/features/public/components/platform-activity-feed";
import { publicActivityService } from "@/services/public-activity.service";

// This page reads a live Supabase activity feed and must not be prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Platform Activity",
  description:
    "Live RyvonX platform activity — deposits, withdrawals, pool investments, and marketplace milestones.",
  path: ROUTES.activity,
  keywords: ["platform activity", "investment activity", "RyvonX live feed"],
});

export default async function ActivityPage() {
  const items = await publicActivityService.listRecent(40);

  return (
    <SectionContainer className="!py-8 md:!py-12">
      <PageHeader
        title="Platform Activity"
        description="Live feed of deposits, withdrawals, pool investments, settlements, and platform milestones across RyvonX."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.transactions}>Your Transactions</Link>
          </Button>
        }
      />

      <PlatformActivityFeed items={items} />

      <p className="mt-8 text-sm text-navy-500">
        Deposits and withdrawals appear here when investors opt in to public activity. For your
        personal history, visit your transaction page.
      </p>
    </SectionContainer>
  );
}
