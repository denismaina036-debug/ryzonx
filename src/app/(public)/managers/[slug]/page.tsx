import { notFound } from "next/navigation";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { ManagerProfileView } from "@/features/marketplace/components/manager-profile-view";
import { marketplacePresentationService } from "@/services/marketplace-presentation.service";
import { managerRatingService } from "@/services/manager-rating.service";

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
