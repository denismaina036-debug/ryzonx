import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import type { PlatformInvestmentLevel } from "@/domain/roi/types";

type LevelRow = {
  id: string;
  name: string;
  min_amount: string | number;
  max_amount: string | number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapLevel(row: LevelRow): PlatformInvestmentLevel {
  return {
    id: row.id,
    name: row.name,
    minAmount: toNumber(row.min_amount),
    maxAmount: row.max_amount != null ? toNumber(row.max_amount) : null,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateInvestmentLevelInput {
  name: string;
  minAmount: number;
  maxAmount?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateInvestmentLevelInput {
  name?: string;
  minAmount?: number;
  maxAmount?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

export const platformInvestmentLevelService = {
  async listActive(): Promise<PlatformInvestmentLevel[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("platform_investment_levels")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as LevelRow[]).map(mapLevel);
  },

  async listAll(): Promise<PlatformInvestmentLevel[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("platform_investment_levels")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as LevelRow[]).map(mapLevel);
  },

  async create(input: CreateInvestmentLevelInput): Promise<PlatformInvestmentLevel> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("platform_investment_levels")
      .insert({
        name: input.name.trim(),
        min_amount: input.minAmount,
        max_amount: input.maxAmount ?? null,
        sort_order: input.sortOrder ?? 0,
        is_active: input.isActive ?? true,
      } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapLevel(data as LevelRow);
  },

  async update(id: string, input: UpdateInvestmentLevelInput): Promise<PlatformInvestmentLevel> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const patch: Record<string, unknown> = {};
    if (input.name != null) patch.name = input.name.trim();
    if (input.minAmount != null) patch.min_amount = input.minAmount;
    if (input.maxAmount !== undefined) patch.max_amount = input.maxAmount;
    if (input.sortOrder != null) patch.sort_order = input.sortOrder;
    if (input.isActive != null) patch.is_active = input.isActive;

    const { data, error } = await db
      .from("platform_investment_levels")
      .update(patch as never)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapLevel(data as LevelRow);
  },

  async remove(id: string): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { error } = await db
      .from("platform_investment_levels")
      .update({ is_active: false } as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  formatLevelRange(level: PlatformInvestmentLevel): string {
    const min = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(level.minAmount);
    if (level.maxAmount == null) {
      return `Above ${min}`;
    }
    const max = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(level.maxAmount);
    return `${min} - ${max}`;
  },
};
