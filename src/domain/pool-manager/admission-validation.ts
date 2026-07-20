import {
  PM_APPLICATION_SECTIONS,
  type PoolManagerAdmissionPath,
  type PoolManagerApplicationData,
  type PoolManagerApplicationSection,
} from "@/domain/pool-manager/types";

export function isSectionComplete(
  section: PoolManagerApplicationSection,
  data: PoolManagerApplicationData
): boolean {
  switch (section) {
    case PM_APPLICATION_SECTIONS.PROFESSIONAL_BACKGROUND: {
      const s = data.professionalBackground;
      return Boolean(
        s?.tradingExperience?.trim() &&
          s.marketsTraded?.length &&
          s.primaryTradingInstrument?.trim() &&
          s.countryOfResidence?.trim()
      );
    }
    case PM_APPLICATION_SECTIONS.TRADING_METHODOLOGY: {
      const s = data.tradingMethodology;
      return Boolean(
        s?.primaryTradingStyle?.trim() &&
          s.averageTradeDuration?.trim() &&
          s.tradingStrategy?.trim() &&
          s.marketAnalysisApproach?.length
      );
    }
    case PM_APPLICATION_SECTIONS.RISK_MANAGEMENT: {
      const s = data.riskManagement;
      return Boolean(
        s?.averageRiskPerTrade?.trim() &&
          s.maximumDrawdown?.trim() &&
          s.riskManagementProcess?.trim() &&
          s.managingLosingStreaks?.trim()
      );
    }
    case PM_APPLICATION_SECTIONS.TRADING_PERFORMANCE: {
      const s = data.tradingPerformance;
      if (s?.maintainsTradingJournal == null || s.hasTradedFundedAccounts == null || s.hasManagedInvestorCapital == null) {
        return false;
      }
      if (s.hasTradedFundedAccounts && !s.fundedAccountExperience?.trim()) return false;
      if (s.hasManagedInvestorCapital && !s.capitalManagementExperience?.trim()) return false;
      return true;
    }
    case PM_APPLICATION_SECTIONS.PERSONAL_STATEMENT: {
      const s = data.personalStatement;
      return Boolean(
        s?.whyPoolManager?.trim() &&
          s.tradingApproachDifference?.trim() &&
          s.investorExpectations?.trim()
      );
    }
    case PM_APPLICATION_SECTIONS.ADMISSION_PATH:
      return data.admissionPath === "trading_challenge" || data.admissionPath === "direct_access";
    case PM_APPLICATION_SECTIONS.REVIEW:
      return Boolean(
        data.reviewConfirmations?.informationAccurate &&
          data.reviewConfirmations?.agreesToTerms &&
          data.reviewConfirmations?.understandsNotGuaranteed
      );
    default:
      return false;
  }
}

export function allSectionsComplete(data: PoolManagerApplicationData): boolean {
  const sections = Object.values(PM_APPLICATION_SECTIONS) as PoolManagerApplicationSection[];
  return sections.every((section) => isSectionComplete(section, data));
}

export function incompleteSections(data: PoolManagerApplicationData): PoolManagerApplicationSection[] {
  const sections = Object.values(PM_APPLICATION_SECTIONS) as PoolManagerApplicationSection[];
  return sections.filter((section) => !isSectionComplete(section, data));
}

export function admissionFeeForPath(
  path: PoolManagerAdmissionPath,
  settings: { tradingChallengeFee: number; directAccessFee: number }
): number {
  return path === "trading_challenge" ? settings.tradingChallengeFee : settings.directAccessFee;
}
