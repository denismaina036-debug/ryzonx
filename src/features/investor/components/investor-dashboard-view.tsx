"use client";

import { motion } from "framer-motion";
import { InvestorDashboardHeader } from "@/features/investor/components/investor-dashboard-header";
import { WalletHeroCard } from "@/features/investor/components/wallet-hero-card";
import { CurrentInvestmentCard } from "@/features/investor/components/current-investment-card";
import { RecentActivityTimeline } from "@/features/investor/components/recent-activity-timeline";
import { PerformanceOverviewCard } from "@/features/investor/components/performance-overview-card";
import { PoolTradesSection } from "@/features/investor/components/open-trades-section";
import { ManagerJourneyCard } from "@/features/investor/components/manager-journey-card";
import { ChallengeCenterCard } from "@/features/challenge/components/challenge-center-card";
import { CHALLENGE_DISPLAY_STATUS, type ChallengeDisplayStatus } from "@/domain/challenge/types";
import { DashboardSummaryBar } from "@/features/investor/components/dashboard-summary-bar";
import { MobileDashboardView } from "@/features/investor/components/mobile/mobile-dashboard-view";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import type { InvestorDashboardPageData } from "@/features/investor/types";
import type { InvestorHomeData } from "@/domain/investment/investor-presentation";
import type { UserProfile } from "@/types";
import { InvestorHomeInvestmentPanel } from "@/features/investor/components/investment/investor-home-investment-panel";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

interface InvestorDashboardViewProps {
  user: UserProfile;
  data: InvestorDashboardPageData;
  homeInvestment: InvestorHomeData;
  challengeDisplayStatus?: ChallengeDisplayStatus;
  challengeProgressPct?: number;
}

export function InvestorDashboardView({
  user,
  data,
  homeInvestment,
  challengeDisplayStatus,
  challengeProgressPct,
}: InvestorDashboardViewProps) {
  const hasInvestments = data.investment.participations.length > 0;
  const dailyProfit = data.poolPerformance.dailyProfit ?? 0;

  return (
    <InvestorPageContent wide>
      {/* Dedicated mobile experience (phones < 768px) */}
      <div className="md:hidden">
        <MobileDashboardView user={user} data={data} homeInvestment={homeInvestment} />
      </div>

      {/* Tablet & desktop experience — unchanged */}
      <div className="hidden md:block">
        <InvestorDashboardHeader
          user={user}
          dailyProfit={dailyProfit}
          hasInvestments={hasInvestments}
        />

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.35 }}
          className="grid gap-5 lg:grid-cols-3 lg:gap-5"
        >
          <div className="flex flex-col gap-5">
            <WalletHeroCard investment={data.investment} />
            <PerformanceOverviewCard performance={data.poolPerformance} />
          </div>

          <div className="flex flex-col gap-5">
            <CurrentInvestmentCard
              performance={data.poolPerformance}
              investment={data.investment}
            />
            <PoolTradesSection trades={data.recentTrades} />
          </div>

          <div className="flex flex-col gap-5">
            <RecentActivityTimeline activity={data.recentActivity} />
            {challengeDisplayStatus &&
            challengeDisplayStatus !== CHALLENGE_DISPLAY_STATUS.NONE ? (
              <ChallengeCenterCard
                displayStatus={challengeDisplayStatus}
                progressPct={challengeProgressPct}
              />
            ) : (
              <ManagerJourneyCard enrollment={data.challengeEnrollment} />
            )}
          </div>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="mt-8"
        >
          <InvestorHomeInvestmentPanel data={homeInvestment} />
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="mt-5"
        >
          <DashboardSummaryBar investment={data.investment} trustScore={null} />
        </motion.div>
      </div>
    </InvestorPageContent>
  );
}
