import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { landingPageService } from "@/services/landing-page.service";
import { landingPageActivityService } from "@/services/landing-page-activity.service";
import { InvestmentActivityFeed } from "@/features/public/components/investment-activity-feed";

export async function ActivitySections() {
  const content = await landingPageService.getPublicContent();
  const [investments, payouts] = await Promise.all([
    landingPageActivityService.listInvestments(6),
    landingPageActivityService.listPayouts(6),
  ]);

  return (
    <SectionContainer className="bg-surface-1">
      <SectionHeader
        badge={content.copy.recentActivity.badge}
        title={content.copy.recentActivity.title}
        description={content.copy.recentActivity.description}
        align="center"
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-lg font-semibold text-navy-950">
            {content.copy.recentActivity.investmentsColumnTitle}
          </h3>
          <InvestmentActivityFeed items={investments} />
        </div>
        <div>
          <h3 className="mb-4 text-lg font-semibold text-navy-950">
            {content.copy.recentActivity.payoutsColumnTitle}
          </h3>
          <InvestmentActivityFeed items={payouts} />
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <Button asChild variant="outline">
          <Link href={ROUTES.activity}>
            {content.copy.recentActivity.viewAllLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </SectionContainer>
  );
}
