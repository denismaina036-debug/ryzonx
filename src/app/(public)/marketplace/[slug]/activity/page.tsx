import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { PoolActivityView } from "@/features/marketplace/components/pool-activity/pool-activity-view";
import { BRAND_NAME } from "@/constants/brand";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { poolActivityService } from "@/services/pool-activity.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await poolActivityService.getPageDataByPoolSlug(slug);
  if (!data) {
    return buildPageMetadata({
      title: "Pool Activity Not Found",
      description: "This pool activity feed could not be found.",
      path: `/marketplace/${slug}/activity`,
      robots: { index: false, follow: false },
    });
  }

  const title = `${data.displayPoolName} — Pool Activity`;
  return buildPageMetadata({
    title,
    description: `Review verified trading activity for ${data.displayPoolName} on ${BRAND_NAME}.`,
    path: `/marketplace/${slug}/activity`,
  });
}

export default async function PoolActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await poolActivityService.getPageDataByPoolSlug(slug);
  if (!data) notFound();

  return (
    <InvestorPageContent>
      <PoolActivityView data={data} />
    </InvestorPageContent>
  );
}
