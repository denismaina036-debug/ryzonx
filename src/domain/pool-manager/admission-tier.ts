import type { PoolManagerAdmissionPath } from "@/domain/pool-manager/types";

export interface PmAdmissionTier {
  id: string;
  slug: string;
  name: string;
  description: string;
  maxCapital: number;
  challengeFee: number;
  instantAccessFee: number;
  challengeTemplateId: string | null;
  challengeTemplateName?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PmAdmissionTierSnapshot {
  tierId: string;
  slug: string;
  name: string;
  maxCapital: number;
  admissionPath: PoolManagerAdmissionPath;
  fee: number;
  challengeTemplateId: string | null;
  capturedAt: string;
}

export type PmAdmissionTierUpdate = Pick<
  PmAdmissionTier,
  | "name"
  | "description"
  | "maxCapital"
  | "challengeFee"
  | "instantAccessFee"
  | "challengeTemplateId"
  | "isActive"
  | "isFeatured"
  | "sortOrder"
>;

export const DEFAULT_PM_ADMISSION_TIERS: PmAdmissionTier[] = [
  { id: "starter", slug: "starter", name: "Starter", description: "Build your RyvonX track record with a focused capital mandate.", maxCapital: 20_000, challengeFee: 100, instantAccessFee: 150, challengeTemplateId: null, isActive: true, isFeatured: false, sortOrder: 10 },
  { id: "intermediate", slug: "intermediate", name: "Intermediate", description: "Step into a broader mandate with balanced professional expectations.", maxCapital: 50_000, challengeFee: 150, instantAccessFee: 200, challengeTemplateId: null, isActive: true, isFeatured: true, sortOrder: 20 },
  { id: "advanced", slug: "advanced", name: "Advanced", description: "For proven traders ready to manage meaningful investor capital.", maxCapital: 100_000, challengeFee: 200, instantAccessFee: 300, challengeTemplateId: null, isActive: true, isFeatured: false, sortOrder: 30 },
  { id: "professional", slug: "professional", name: "Professional", description: "A substantial mandate for disciplined, established trading professionals.", maxCapital: 250_000, challengeFee: 300, instantAccessFee: 400, challengeTemplateId: null, isActive: true, isFeatured: false, sortOrder: 40 },
  { id: "elite", slug: "elite", name: "Elite", description: "RyvonX's highest admission tier for exceptional capital managers.", maxCapital: 1_000_000, challengeFee: 350, instantAccessFee: 499, challengeTemplateId: null, isActive: true, isFeatured: false, sortOrder: 50 },
];

export function admissionTierFee(tier: PmAdmissionTier, path: PoolManagerAdmissionPath): number {
  return path === "trading_challenge" ? tier.challengeFee : tier.instantAccessFee;
}

export function snapshotAdmissionTier(
  tier: PmAdmissionTier,
  path: PoolManagerAdmissionPath
): PmAdmissionTierSnapshot {
  return {
    tierId: tier.id,
    slug: tier.slug,
    name: tier.name,
    maxCapital: tier.maxCapital,
    admissionPath: path,
    fee: admissionTierFee(tier, path),
    challengeTemplateId: tier.challengeTemplateId,
    capturedAt: new Date().toISOString(),
  };
}
