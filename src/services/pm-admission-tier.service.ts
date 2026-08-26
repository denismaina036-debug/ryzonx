import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorization";
import { auditService } from "@/services/audit.service";
import {
  DEFAULT_PM_ADMISSION_TIERS,
  type PmAdmissionTier,
  type PmAdmissionTierUpdate,
} from "@/domain/pool-manager/admission-tier";

type TierRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  max_capital: number | string;
  challenge_fee: number | string;
  instant_access_fee: number | string;
  challenge_template_id: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  challenge_templates?: { name: string } | null;
};

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300),
  maxCapital: z.coerce.number().positive().max(1_000_000),
  challengeFee: z.coerce.number().min(0).max(100_000),
  instantAccessFee: z.coerce.number().min(0).max(100_000),
  challengeTemplateId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
}).refine((value) => value.instantAccessFee >= value.challengeFee, {
  message: "Instant Access must cost at least as much as the Challenge route.",
  path: ["instantAccessFee"],
});

function mapTier(row: TierRow): PmAdmissionTier {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    maxCapital: Number(row.max_capital),
    challengeFee: Number(row.challenge_fee),
    instantAccessFee: Number(row.instant_access_fee),
    challengeTemplateId: row.challenge_template_id,
    challengeTemplateName: row.challenge_templates?.name ?? null,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function rows(activeOnly: boolean): Promise<PmAdmissionTier[] | null> {
  const db = createAdminClient();
  let query = db.from("pm_admission_tiers").select("*, challenge_templates(name)").order("sort_order", { ascending: true });
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01" || error.message.includes("pm_admission_tiers")) return null;
    throw new Error(error.message);
  }
  return (data as unknown as TierRow[]).map(mapTier);
}

export const pmAdmissionTierService = {
  async listPublic(): Promise<PmAdmissionTier[]> {
    return (await rows(true)) ?? DEFAULT_PM_ADMISSION_TIERS.map((tier) => ({ ...tier }));
  },

  async listAdmin(): Promise<PmAdmissionTier[]> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    return (await rows(false)) ?? DEFAULT_PM_ADMISSION_TIERS.map((tier) => ({ ...tier }));
  },

  async getActive(id: string): Promise<PmAdmissionTier | null> {
    const tiers = await this.listPublic();
    return tiers.find((tier) => tier.id === id || tier.slug === id) ?? null;
  },

  async update(id: string, input: PmAdmissionTierUpdate, actorId: string): Promise<PmAdmissionTier> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const parsed = updateSchema.parse(input);
    const db = createAdminClient();

    if (parsed.isFeatured) {
      await db.from("pm_admission_tiers").update({ is_featured: false } as never).neq("id", id);
    }

    const { data, error } = await db.from("pm_admission_tiers").update({
      name: parsed.name,
      description: parsed.description,
      max_capital: parsed.maxCapital,
      challenge_fee: parsed.challengeFee,
      instant_access_fee: parsed.instantAccessFee,
      challenge_template_id: parsed.challengeTemplateId,
      is_active: parsed.isActive,
      is_featured: parsed.isFeatured,
      sort_order: parsed.sortOrder,
    } as never).eq("id", id).select("*, challenge_templates(name)").single();
    if (error || !data) throw new Error(error?.message ?? "Could not update admission tier.");

    await auditService.log({
      actorId,
      action: "pm_admission_tier_updated",
      entityType: "pm_admission_tier",
      entityId: id,
      newValues: parsed as unknown as Record<string, unknown>,
    });

    return mapTier(data as unknown as TierRow);
  },
};
