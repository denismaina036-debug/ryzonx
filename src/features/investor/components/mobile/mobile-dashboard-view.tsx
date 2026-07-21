"use client";

import { motion } from "framer-motion";
import { MobileGreeting } from "@/features/investor/components/mobile/mobile-greeting";
import { MobilePortfolioCard } from "@/features/investor/components/mobile/mobile-portfolio-card";
import { MobilePrimaryActions } from "@/features/investor/components/mobile/mobile-primary-actions";
import { MobileCurrentPoolCard } from "@/features/investor/components/mobile/mobile-current-pool-card";
import { MobilePerformanceSummary } from "@/features/investor/components/mobile/mobile-performance-summary";
import { MobileTradesPreview } from "@/features/investor/components/mobile/mobile-trades-preview";
import { MobileRecentActivity } from "@/features/investor/components/mobile/mobile-recent-activity";
import { MobileManagerJourney } from "@/features/investor/components/mobile/mobile-manager-journey";
import type { InvestorDashboardPageData } from "@/features/investor/types";
import type { InvestorHomeData } from "@/domain/investment/investor-presentation";
import type { UserProfile } from "@/types";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import type { PmJourneyCardVariant } from "@/domain/investor/pm-journey-variant";

interface MobileDashboardViewProps {
  user: UserProfile;
  data: InvestorDashboardPageData;
  homeInvestment?: InvestorHomeData;
  showManagerJourneyCard?: boolean;
  pmJourneyVariant?: PmJourneyCardVariant;
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export function MobileDashboardView({
  user,
  data,
  homeInvestment,
  showManagerJourneyCard = false,
  pmJourneyVariant = "become",
}: MobileDashboardViewProps) {
  const firstName = user.fullName.split(" ")[0] ?? user.fullName;
  const hasInvestments = data.investment.participations.length > 0;
  const dailyProfit = data.poolPerformance.dailyProfit ?? 0;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4"
    >
      <motion.div variants={item}>
        <MobileGreeting
          firstName={firstName}
          dailyProfit={dailyProfit}
          hasInvestments={hasInvestments}
        />
      </motion.div>

      <motion.div variants={item}>
        <MobilePortfolioCard
          investment={data.investment}
          performance={data.poolPerformance}
        />
      </motion.div>

      <motion.div variants={item}>
        <MobilePrimaryActions hasActivePool={hasInvestments} />
      </motion.div>

      {homeInvestment && homeInvestment.recommendedCycles.length > 0 && (
        <motion.div variants={item}>
          <Link
            href={ROUTES.marketplace}
            className="block rounded-[var(--id-radius)] border border-[var(--id-accent)]/30 bg-[var(--id-accent-soft)] p-4 text-sm"
          >
            <p className="font-semibold text-[var(--id-text)]">Investment opportunities</p>
            <p className="mt-1 text-[var(--id-text-muted)]">
              {homeInvestment.recommendedCycles.length} cycle
              {homeInvestment.recommendedCycles.length === 1 ? "" : "s"} open for funding
            </p>
          </Link>
        </motion.div>
      )}

      <motion.div variants={item}>
        <MobileCurrentPoolCard
          investment={data.investment}
          performance={data.poolPerformance}
        />
      </motion.div>

      <motion.div variants={item}>
        <MobilePerformanceSummary
          performance={data.poolPerformance}
          trades={data.recentTrades}
        />
      </motion.div>

      <motion.div variants={item}>
        <MobileTradesPreview trades={data.recentTrades} />
      </motion.div>

      <motion.div variants={item}>
        <MobileRecentActivity activity={data.recentActivity} />
      </motion.div>

      {showManagerJourneyCard && (
        <motion.div variants={item}>
          <MobileManagerJourney
            enrollment={data.challengeEnrollment}
            pmJourneyVariant={pmJourneyVariant}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
