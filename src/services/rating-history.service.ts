import { createAdminClient } from "@/lib/supabase/admin";
import type { RatingEntityType, RatingTrend } from "@/constants/rating";
import type { RatingHistoryEntry, RatingSnapshot } from "@/domain/performance-intelligence/types";

type SnapshotRow = {
  id: string;
  entity_type: RatingEntityType;
  entity_id: string;
  profile_id: string;
  overall_score: string | number;
  overall_rating: string | number | null;
  performance_grade: string | null;
  risk_grade: string | null;
  governance_grade: string | null;
  consistency_score: string | number | null;
  operational_score: string | number | null;
  confidence_score: string | number | null;
  category_scores: Record<string, number>;
  explanations: Record<string, string>;
  source_metrics: Record<string, unknown>;
  trend: RatingTrend;
  computed_at: string;
};

type HistoryRow = {
  id: string;
  entity_type: RatingEntityType;
  entity_id: string;
  profile_id: string | null;
  previous_rating: string | number | null;
  new_rating: string | number;
  previous_score: string | number | null;
  new_score: string | number;
  reason: string;
  source_metrics: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
};

function toNum(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  return typeof v === "number" ? v : Number(v);
}

function mapSnapshot(row: SnapshotRow): RatingSnapshot {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    profileId: row.profile_id,
    overallScore: toNum(row.overall_score) ?? 0,
    overallRating: toNum(row.overall_rating),
    performanceGrade: row.performance_grade,
    riskGrade: row.risk_grade,
    governanceGrade: row.governance_grade,
    consistencyScore: toNum(row.consistency_score),
    operationalScore: toNum(row.operational_score),
    confidenceScore: toNum(row.confidence_score),
    categoryScores: row.category_scores ?? {},
    explanations: row.explanations ?? {},
    sourceMetrics: row.source_metrics ?? {},
    trend: row.trend,
    computedAt: row.computed_at,
  };
}

function mapHistory(row: HistoryRow): RatingHistoryEntry {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    profileId: row.profile_id,
    previousRating: toNum(row.previous_rating),
    newRating: toNum(row.new_rating) ?? 0,
    previousScore: toNum(row.previous_score),
    newScore: toNum(row.new_score) ?? 0,
    reason: row.reason,
    sourceMetrics: row.source_metrics ?? {},
    actorId: row.actor_id,
    createdAt: row.created_at,
  };
}

export const ratingHistoryService = {
  async getLatestSnapshot(
    entityType: RatingEntityType,
    entityId: string
  ): Promise<RatingSnapshot | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("rating_snapshots")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (error || !data) return null;
    return mapSnapshot(data as SnapshotRow);
  },

  async listHistory(
    entityType: RatingEntityType,
    entityId: string,
    limit = 20
  ): Promise<RatingHistoryEntry[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("rating_history")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as HistoryRow[]).map(mapHistory);
  },

  async saveSnapshot(input: {
    entityType: RatingEntityType;
    entityId: string;
    profileId: string;
    overallScore: number;
    overallRating: number;
    performanceGrade: string;
    riskGrade: string;
    governanceGrade: string;
    consistencyScore: number;
    operationalScore: number;
    confidenceScore: number;
    categoryScores: Record<string, number>;
    explanations: Record<string, string>;
    sourceMetrics: Record<string, unknown>;
    trend: RatingTrend;
    reason: string;
    actorId?: string | null;
  }): Promise<{ snapshot: RatingSnapshot; history: RatingHistoryEntry | null }> {
    const db = createAdminClient();
    const existing = await this.getLatestSnapshot(input.entityType, input.entityId);

    const { data, error } = await db
      .from("rating_snapshots")
      .upsert(
        {
          entity_type: input.entityType,
          entity_id: input.entityId,
          profile_id: input.profileId,
          overall_score: input.overallScore,
          overall_rating: input.overallRating,
          performance_grade: input.performanceGrade,
          risk_grade: input.riskGrade,
          governance_grade: input.governanceGrade,
          consistency_score: input.consistencyScore,
          operational_score: input.operationalScore,
          confidence_score: input.confidenceScore,
          category_scores: input.categoryScores,
          explanations: input.explanations,
          source_metrics: input.sourceMetrics,
          trend: input.trend,
          computed_at: new Date().toISOString(),
        } as never,
        { onConflict: "entity_type,entity_id,profile_id" }
      )
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const snapshot = mapSnapshot(data as SnapshotRow);

    let history: RatingHistoryEntry | null = null;
    const ratingChanged =
      !existing ||
      Math.abs((existing.overallRating ?? 0) - input.overallRating) >= 0.05 ||
      Math.abs(existing.overallScore - input.overallScore) >= 1;

    if (ratingChanged) {
      const { data: histData, error: histError } = await db
        .from("rating_history")
        .insert({
          entity_type: input.entityType,
          entity_id: input.entityId,
          profile_id: input.profileId,
          previous_rating: existing?.overallRating ?? null,
          new_rating: input.overallRating,
          previous_score: existing?.overallScore ?? null,
          new_score: input.overallScore,
          reason: input.reason,
          source_metrics: input.sourceMetrics,
          actor_id: input.actorId ?? null,
        } as never)
        .select("*")
        .single();

      if (!histError && histData) {
        history = mapHistory(histData as HistoryRow);
      }
    }

    return { snapshot, history };
  },

  async listRecentChanges(limit = 30): Promise<RatingHistoryEntry[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("rating_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as HistoryRow[]).map(mapHistory);
  },
};
