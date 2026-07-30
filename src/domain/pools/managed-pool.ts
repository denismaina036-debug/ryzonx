/**



 * Managed Pool — user-facing Pool domain.



 * Maps to `funds` row + internal strategy/cycle records (implementation detail).



 */







import {
  DEFAULT_COVER_IMAGE_POSITION,
  type CoverImagePosition,
} from "@/domain/pools/cover-image-position";
import type { PayoutDurationPreset } from "@/domain/pools/payout-duration";
import type {
  ReturnDurationPreset,
  ReturnDurationUnit,
} from "@/domain/roi/types";
import type { RoiMultiplierEntry } from "@/features/pool-manager/components/managed-pool/pm-roi-multiplier-editor";







export const MANAGED_POOL_VISIBILITY = ["public", "private", "invite_only"] as const;



export type ManagedPoolVisibility = (typeof MANAGED_POOL_VISIBILITY)[number];







export const MANAGED_POOL_RISK_LEVELS = [



  "conservative",



  "balanced",



  "growth",



  "aggressive",



] as const;



export type ManagedPoolRiskLevel = (typeof MANAGED_POOL_RISK_LEVELS)[number];







export const MANAGED_POOL_DURATION_UNITS = ["hours", "days", "weeks"] as const;



export type ManagedPoolDurationUnit = (typeof MANAGED_POOL_DURATION_UNITS)[number];



export type { PayoutDurationPreset } from "@/domain/pools/payout-duration";













/** Extended config stored in funds.pool_faq.managedPool */



export interface ManagedPoolConfig {



  strategyId?: string;



  strategyName?: string;



  tradingStyle?: string;



  timeframes?: string;



  tradingSessions?: string;



  tradingHours?: string;

  tradingSessionKey?: string;

  tradingSessionCustom?: string;

  tradingTimeNy?: string;

  tradingSchedulePreset?: string;

  tradingScheduleDays?: string[];

  tradingScheduleTime?: string;

  marketTypeCode?: string;

  tradingInstrumentCode?: string;

  /** Selected market codes (multi-select, same as PM application). */
  marketsTradedCodes?: string[];

  /** Selected instrument codes for the chosen markets. */
  tradingInstrumentCodes?: string[];



  expectedBehavior?: string;



  managerNotes?: string;



  tradingMethodology?: string;



  fundingPeriodDays?: number;



  openingDate?: string;



  closingDate?: string;



  scheduleOpenEnded?: boolean;



  durationUnit?: ManagedPoolDurationUnit;



  payoutDurationPreset?: PayoutDurationPreset;

  returnDurationPreset?: ReturnDurationPreset;
  returnDurationValue?: number;
  returnDurationUnit?: ReturnDurationUnit;

  maxDrawdownPct?: number;



  leverage?: string;



  visibility?: ManagedPoolVisibility;



  internalStrategyId?: string;



  internalCycleId?: string;



}







export interface ManagedPoolFormInput {



  poolName: string;



  poolDescription: string;



  poolImageUrl?: string;

  coverImagePosition: CoverImagePosition;

  cardBackgroundColor: string;



  /** Selected approved strategy — required on submit. */



  strategyId: string;



  /** Legacy fields retained for mapping existing records. */



  strategyName: string;



  strategyDescription: string;



  tradingStyle: string;



  markets: string;



  timeframes: string;



  tradingSessions: string;



  tradingHours: string;

  tradingSessionKey: string;

  tradingSessionCustom: string;

  tradingTimeNy: string;

  tradingSchedulePreset: string;

  tradingScheduleDays: string[];

  tradingScheduleTime: string;

  marketTypeCode: string;

  tradingInstrumentCode: string;

  marketsTradedCodes: string[];

  tradingInstrumentCodes: string[];



  expectedBehavior: string;



  managerNotes: string;



  tradingMethodology: string;



  minInvestment: string;



  maxInvestment: string;



  maxPoolSize: string;



  maxInvestors: string;

  /** Marketplace display seed — participants numerator until live exceeds. */
  displayActiveInvestors: string;

  /** Marketplace display seed — raised capital until live exceeds. */
  displayRaisedCapital: string;

  fundingPeriodDays: string;



  tradingDurationDays: string;



  durationUnit: ManagedPoolDurationUnit;



  payoutDurationPreset: PayoutDurationPreset;

  /** ROI v2 return duration configuration. */
  returnDurationPreset: ReturnDurationPreset;
  returnDurationValue: string;
  returnDurationUnit: ReturnDurationUnit;

  /** ROI v2 multipliers per platform investment level. */
  roiMultipliers: RoiMultiplierEntry[];

  openingDate: string;



  closingDate: string;



  scheduleOpenEnded: boolean;



  riskLevel: ManagedPoolRiskLevel | "";



  targetReturnPct: string;



  maxDrawdownPct: string;



  leverage: string;

  visibility: ManagedPoolVisibility;



}







export function emptyManagedPoolForm(): ManagedPoolFormInput {



  return {



    poolName: "",



    poolDescription: "",



    poolImageUrl: "",

    coverImagePosition: { ...DEFAULT_COVER_IMAGE_POSITION },

    cardBackgroundColor: "#0f1623",



    strategyId: "",



    strategyName: "",



    strategyDescription: "",



    tradingStyle: "",



    markets: "",



    timeframes: "",



    tradingSessions: "",



    tradingHours: "",

    tradingSessionKey: "",

    tradingSessionCustom: "",

    tradingTimeNy: "",

    tradingSchedulePreset: "",

    tradingScheduleDays: [],

    tradingScheduleTime: "",

    marketTypeCode: "",

    tradingInstrumentCode: "",

    marketsTradedCodes: [],

    tradingInstrumentCodes: [],



    expectedBehavior: "",



    managerNotes: "",



    tradingMethodology: "",



    minInvestment: "",



    maxInvestment: "",



    maxPoolSize: "",



    maxInvestors: "",

    displayActiveInvestors: "",

    displayRaisedCapital: "",

    fundingPeriodDays: "",



    tradingDurationDays: "",



    durationUnit: "days",



    payoutDurationPreset: "daily",

    returnDurationPreset: "daily",
    returnDurationValue: "1",
    returnDurationUnit: "days",
    roiMultipliers: [],

    openingDate: "",



    closingDate: "",



    scheduleOpenEnded: false,



    riskLevel: "",



    targetReturnPct: "",



    maxDrawdownPct: "",



    leverage: "",

    visibility: "public",



  };



}







export interface InitialManagerRatingInput {



  ryvonxRating: number;



  experienceLevel?: string;



  riskClassification?: string;



  isVerified?: boolean;



  featured?: boolean;



}







export const MANAGED_POOL_STATUS_LABELS: Record<string, string> = {



  draft: "Draft",



  submitted: "Submitted",



  under_review: "Under Review",



  approved: "Approved",



  live: "Live",



  closed: "Closed",



  archived: "Archived",



  rejected: "Rejected",



  suspended: "Suspended",



  paused: "Paused",



  restricted: "Restricted",



};





/** Minimal fields when creating a future investment cycle from an approved pool. */



export interface CreatePoolCycleInput {



  name?: string;



  openingDate?: string;



  closingDate?: string;



}


