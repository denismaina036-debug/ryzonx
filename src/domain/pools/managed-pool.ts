/**



 * Managed Pool — user-facing Pool domain.



 * Maps to `funds` row + internal strategy/cycle records (implementation detail).



 */







import type { ReturnTier } from "@/features/investor/types/account";
import type { ManagedPoolReturnModel } from "@/domain/pools/return-model";
import type { FixedReturnRow } from "@/domain/pools/fixed-return";
import { DEFAULT_FIXED_RETURN_ROWS } from "@/domain/pools/fixed-return";
import { DEFAULT_VARIABLE_RETURN_TIERS } from "@/domain/pools/variable-return";
import {
  DEFAULT_COVER_IMAGE_POSITION,
  type CoverImagePosition,
} from "@/domain/pools/cover-image-position";







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







export const DEFAULT_MANAGED_POOL_RETURN_TIERS: ReturnTier[] = [...DEFAULT_VARIABLE_RETURN_TIERS];







/** Extended config stored in funds.pool_faq.managedPool */



export interface ManagedPoolConfig {



  strategyId?: string;



  strategyName?: string;



  tradingStyle?: string;



  timeframes?: string;



  tradingSessions?: string;



  tradingHours?: string;

  returnModel?: ManagedPoolReturnModel;

  /** Fixed Return schedule — only used when returnModel is "fixed". */
  fixedReturnRows?: FixedReturnRow[];

  tradingSessionKey?: string;

  tradingSessionCustom?: string;

  tradingTimeNy?: string;

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

  returnModel: ManagedPoolReturnModel;

  /** Fixed Return amount mapping — independent from returnTiers. */
  fixedReturnRows: FixedReturnRow[];

  /** Variable Return tiers — independent from fixedReturnRows. */
  returnTiers: ReturnTier[];

  tradingSessionKey: string;

  tradingSessionCustom: string;

  tradingTimeNy: string;

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



  fundingPeriodDays: string;



  tradingDurationDays: string;



  durationUnit: ManagedPoolDurationUnit;



  openingDate: string;



  closingDate: string;



  scheduleOpenEnded: boolean;



  riskLevel: ManagedPoolRiskLevel | "";



  targetReturnPct: string;



  maxDrawdownPct: string;



  leverage: string;



  investorSharePct: string;



  poolManagerSharePct: string;



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

    returnModel: "variable",

    fixedReturnRows: [...DEFAULT_FIXED_RETURN_ROWS],

    returnTiers: [...DEFAULT_MANAGED_POOL_RETURN_TIERS],

    tradingSessionKey: "",

    tradingSessionCustom: "",

    tradingTimeNy: "",

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



    fundingPeriodDays: "",



    tradingDurationDays: "",



    durationUnit: "days",



    openingDate: "",



    closingDate: "",



    scheduleOpenEnded: false,



    riskLevel: "",



    targetReturnPct: "",



    maxDrawdownPct: "",



    leverage: "",



    investorSharePct: "80",



    poolManagerSharePct: "20",



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


