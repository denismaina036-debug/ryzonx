import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { RATING_AUDIT_ACTIONS, RATING_ENTITY_TYPE } from "@/constants/rating";
import type { RatingCategory } from "@/constants/rating";
import { auditService } from "@/services/audit.service";
import type { RatingCategoryWeight, RatingProfile, RatingProfileRules } from "@/domain/performance-intelligence/types";

type ProfileRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
  rules: RatingProfileRules;
  created_at: string;
  updated_at: string;
};

type WeightRow = {
  id: string;
  profile_id: string;
  category: string;
  label: string;
  weight: string | number;
  created_at: string;
  updated_at: string;
};

function mapProfile(row: ProfileRow): RatingProfile {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    rules: (row.rules ?? {}) as RatingProfileRules,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWeight(row: WeightRow): RatingCategoryWeight {
  return {
    id: row.id,
    profileId: row.profile_id,
    category: row.category as RatingCategory,
    label: row.label,
    weight: typeof row.weight === "number" ? row.weight : Number(row.weight),
  };
}

export const ratingConfigurationService = {
  async getActiveProfile(): Promise<{ profile: RatingProfile; weights: RatingCategoryWeight[] } | null> {
    const db = createAdminClient();
    const { data: profileData } = await db
      .from("rating_profiles")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!profileData) return null;
    const profile = mapProfile(profileData as ProfileRow);

    const { data: weightsData } = await db
      .from("rating_category_weights")
      .select("*")
      .eq("profile_id", profile.id)
      .order("category");

    return {
      profile,
      weights: ((weightsData ?? []) as WeightRow[]).map(mapWeight),
    };
  },

  async listProfiles(): Promise<RatingProfile[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db.from("rating_profiles").select("*").order("name");
    if (error) throw new Error(error.message);
    return ((data ?? []) as ProfileRow[]).map(mapProfile);
  },

  async getProfileWithWeights(profileId: string): Promise<{ profile: RatingProfile; weights: RatingCategoryWeight[] }> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data: profileData, error } = await db
      .from("rating_profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();
    if (error || !profileData) throw new Error("Rating profile not found.");

    const profile = mapProfile(profileData as ProfileRow);
    const { data: weightsData } = await db
      .from("rating_category_weights")
      .select("*")
      .eq("profile_id", profileId)
      .order("category");

    return { profile, weights: ((weightsData ?? []) as WeightRow[]).map(mapWeight) };
  },

  async updateWeights(
    profileId: string,
    weights: Array<{ category: RatingCategory; weight: number }>
  ): Promise<RatingCategoryWeight[]> {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    const total = weights.reduce((s, w) => s + w.weight, 0);
    if (Math.abs(total - 1) > 0.01) {
      throw new Error("Category weights must sum to 1.0 (100%).");
    }

    const db = createAdminClient();
    const { profile } = await this.getProfileWithWeights(profileId);
    const oldWeights = profile.id;

    for (const w of weights) {
      const { error } = await db
        .from("rating_category_weights")
        .update({ weight: w.weight } as never)
        .eq("profile_id", profileId)
        .eq("category", w.category);
      if (error) throw new Error(error.message);
    }

    await auditService.log({
      actorId: user.id,
      action: RATING_AUDIT_ACTIONS.WEIGHTS_UPDATED,
      entityType: RATING_ENTITY_TYPE,
      entityId: profileId,
      oldValues: { profileId: oldWeights },
      newValues: { weights },
    });

    const updated = await this.getProfileWithWeights(profileId);
    return updated.weights;
  },

  async updateProfile(
    profileId: string,
    input: { name?: string; description?: string; rules?: RatingProfileRules }
  ): Promise<RatingProfile> {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = input.description;
    if (input.rules !== undefined) patch.rules = input.rules;

    const { data, error } = await db
      .from("rating_profiles")
      .update(patch as never)
      .eq("id", profileId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await auditService.log({
      actorId: user.id,
      action: RATING_AUDIT_ACTIONS.PROFILE_UPDATED,
      entityType: RATING_ENTITY_TYPE,
      entityId: profileId,
      newValues: patch,
    });

    return mapProfile(data as ProfileRow);
  },
};
