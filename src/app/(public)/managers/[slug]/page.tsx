import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { ManagerProfileView } from "@/features/marketplace/components/manager-profile-view";
import { BRAND_NAME } from "@/constants/brand";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { marketplacePresentationService } from "@/services/marketplace-presentation.service";
import { managerRatingService } from "@/services/manager-rating.service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await marketplacePresentationService.getManagerProfilePageData(slug);
  if (!data) {
    return buildPageMetadata({
      title: "Manager Not Found",
      description: "This pool manager profile could not be found on RyvonX.",
      path: `/managers/${slug}`,
      robots: { index: false, follow: false },
    });
  }

  const { profile } = data;
  const title = profile.publicDisplayName || profile.displayName;
  const description =
    profile.biography?.slice(0, 160) ||
    `${title} is a verified pool manager on ${BRAND_NAME}. View pools, performance, and trading history.`;

  return buildPageMetadata({
    title,
    description,
    path: `/managers/${slug}`,
    image: profile.coverImageUrl || profile.profilePhotoUrl || undefined,
    imageAlt: `${title} — ${BRAND_NAME} pool manager`,
    keywords: [title, "pool manager", "verified trader", BRAND_NAME, ...profile.markets].filter(
      Boolean
    ),
  });
}

export default async function ManagerPublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await marketplacePresentationService.getManagerProfilePageData(slug);
  if (!data) notFound();

  const investorRating = await managerRatingService.getInvestorView(data.profile.id);

  return (
    <InvestorPageContent wide>
      <ManagerProfileView
        profile={data.profile}
        managedPools={data.managedPools}
        journalEntries={data.journalEntries}
        strategies={data.strategies}
        cycles={data.cycles}
        investorRating={investorRating}
      />
    </InvestorPageContent>
  );
}
