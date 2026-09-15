import { copyTradingText } from "@/lib/copy-trading-presentation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { landingPageService } from "@/services/landing-page.service";
import { landingPageActivityService } from "@/services/landing-page-activity.service";
import { InvestmentActivityFeed } from "@/features/public/components/investment-activity-feed";
import { withTimeout } from "@/lib/async/with-timeout";

export async function ActivitySections() {
  const content = await landingPageService.getPublicContent();
  const [investments, payouts] = await Promise.all([
    withTimeout(
      landingPageActivityService.listInvestments(6),
      1_500,
      "Recent copy allocation activity timed out"
    ).catch(() => []),
    withTimeout(
      landingPageActivityService.listPayouts(6),
      1_500,
      "Recent payout activity timed out"
    ).catch(() => []),
  ]);

  return (
    <SectionContainer className="bg-surface-1" landingMobile>
      <SectionHeader
        badge={copyTradingText(content.copy.recentActivity.badge)}
        title={copyTradingText(content.copy.recentActivity.title)}
        description={copyTradingText(content.copy.recentActivity.description)}
        align="center"
        compactMobile
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-lg font-semibold text-navy-950">
            Recent Deposits
          </h3>
          <InvestmentActivityFeed items={investments} />
        </div>
        <div>
          <h3 className="mb-4 text-lg font-semibold text-navy-950">
            Withdrawals &amp; Distributed Profits
          </h3>
          <InvestmentActivityFeed items={payouts} />
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <Button asChild variant="outline">
          <Link href={ROUTES.activity}>
            {copyTradingText(content.copy.recentActivity.viewAllLabel)}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </SectionContainer>
  );
}
