import { createAdminClient } from "@/lib/supabase/admin";
import type { PoolRoiMultiplier } from "@/domain/roi/types";
import type { PlatformInvestmentLevel } from "@/domain/roi/types";
import { platformInvestmentLevelService } from "@/services/platform-investment-level.service";

type MultiplierRow = {
  id: string;
  fund_id: string;
  investment_level_id: string;
  multiplier: string | number;
  created_at: string;
  updated_at: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapMultiplier(row: MultiplierRow, level?: PlatformInvestmentLevel): PoolRoiMultiplier {
  return {
    id: row.id,
    fundId: row.fund_id,
    investmentLevelId: row.investment_level_id,
    multiplier: toNumber(row.multiplier),
    level,
  };
}

export const poolRoiService = {
  async getMultipliersForFunds(fundIds: string[]): Promise<Map<string, PoolRoiMultiplier[]>> {
    if (fundIds.length === 0) return new Map();

    const db = createAdminClient();
    const levels = await platformInvestmentLevelService.listActive();
    const levelMap = new Map(levels.map((l) => [l.id, l]));

    const { data, error } = await db
      .from("pool_roi_multipliers")
      .select("*")
      .in("fund_id", fundIds);
    if (error) throw new Error(error.message);

    const result = new Map<string, PoolRoiMultiplier[]>();
    for (const fundId of fundIds) {
      result.set(fundId, []);
    }

    for (const row of (data ?? []) as MultiplierRow[]) {
      const list = result.get(row.fund_id) ?? [];
      list.push(mapMultiplier(row, levelMap.get(row.investment_level_id)));
      result.set(row.fund_id, list);
    }

    return result;
  },

  async getMultipliersForFund(fundId: string): Promise<PoolRoiMultiplier[]> {
    const db = createAdminClient();
    const levels = await platformInvestmentLevelService.listActive();

    const { data, error } = await db
      .from("pool_roi_multipliers")
      .select("*")
      .eq("fund_id", fundId);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as MultiplierRow[];
    const levelMap = new Map(levels.map((l) => [l.id, l]));

    return rows.map((row) =>
      mapMultiplier(row, levelMap.get(row.investment_level_id))
    );
  },

  async upsertMultipliers(
    fundId: string,
    multipliers: Array<{ investmentLevelId: string; multiplier: number }>
  ): Promise<void> {
    const db = createAdminClient();

    for (const entry of multipliers) {
      const { error } = await db.from("pool_roi_multipliers").upsert(
        {
          fund_id: fundId,
          investment_level_id: entry.investmentLevelId,
          multiplier: entry.multiplier,
        } as never,
        { onConflict: "fund_id,investment_level_id" }
      );
      if (error) throw new Error(error.message);
    }
  },

  async getReturnDuration(fundId: string): Promise<{
    preset: string | null;
    value: number | null;
    unit: string | null;
  }> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("funds")
      .select("return_duration_preset, return_duration_value, return_duration_unit")
      .eq("id", fundId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = data as {
      return_duration_preset?: string | null;
      return_duration_value?: number | null;
      return_duration_unit?: string | null;
    } | null;
    return {
      preset: row?.return_duration_preset ?? null,
      value: row?.return_duration_value ?? null,
      unit: row?.return_duration_unit ?? null,
    };
  },

  /** Build complete multiplier set with defaults for missing levels. */
  async getCompleteMultipliers(fundId: string): Promise<PoolRoiMultiplier[]> {
    const levels = await platformInvestmentLevelService.listActive();
    const existing = await this.getMultipliersForFund(fundId);
    const existingMap = new Map(existing.map((m) => [m.investmentLevelId, m]));

    return levels.map((level, index) => {
      const found = existingMap.get(level.id);
      if (found) return { ...found, level };
      const defaultMultiplier = index === 0 ? 2.0 : index === 1 ? 2.3 : 2.5;
      return {
        id: "",
        fundId,
        investmentLevelId: level.id,
        multiplier: defaultMultiplier,
        level,
      };
    });
  },
};
