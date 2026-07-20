import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { REFERENCE_DATA_CATALOG } from "@/domain/reference-data/catalog";
import {
  getCatalogInstrumentsForMarkets,
  getCatalogOptions,
} from "@/domain/reference-data/catalog-options";
import { REFERENCE_SET_KEYS, type ReferenceSetKey } from "@/domain/reference-data/set-keys";
import type { ReferenceDataItem, ReferenceDataOption, ReferenceDataSet } from "@/domain/reference-data/types";

type ItemRow = {
  id: string;
  set_key: string;
  code: string;
  label: string;
  parent_code: string | null;
  search_text: string;
  sort_order: number;
  is_enabled: boolean;
  is_archived: boolean;
  metadata: Record<string, unknown>;
};

import { normalizeMarketCode, normalizeMarketCodes } from "@/domain/reference-data/utils";

function mapItem(row: ItemRow): ReferenceDataItem {
  return {
    id: row.id,
    setKey: row.set_key as ReferenceSetKey,
    code: row.code,
    label: row.label,
    parentCode: row.parent_code,
    searchText: row.search_text,
    sortOrder: row.sort_order,
    isEnabled: row.is_enabled,
    isArchived: row.is_archived,
    metadata: row.metadata ?? {},
  };
}

function toOption(item: ReferenceDataItem): ReferenceDataOption {
  return {
    code: item.code,
    label: item.label,
    parentCode: item.parentCode,
    searchText: item.searchText,
    metadata: item.metadata,
  };
}

function buildSearchText(input: {
  code: string;
  label: string;
  searchTerms?: string;
  parentCode?: string | null;
}): string {
  return [input.label, input.code, input.searchTerms, input.parentCode]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

let seedPromise: Promise<boolean> | null = null;

function scheduleSeed(): void {
  void ensureSeeded();
}

async function ensureSeeded(): Promise<boolean> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const db = createAdminClient();
      const { count, error } = await db
        .from("platform_reference_sets" as never)
        .select("key", { count: "exact", head: true });

      if (error) return false;
      if ((count ?? 0) > 0) return true;

      for (const set of REFERENCE_DATA_CATALOG) {
        await db.from("platform_reference_sets" as never).upsert(
          {
            key: set.key,
            name: set.name,
            description: set.description,
            is_admin_managed: true,
          } as never,
          { onConflict: "key" }
        );

        const rows = set.items.map((item, index) => ({
          set_key: set.key,
          code: item.code,
          label: item.label,
          parent_code: item.parentCode ?? null,
          search_text: buildSearchText({
            code: item.code,
            label: item.label,
            searchTerms: item.searchTerms,
            parentCode: item.parentCode,
          }),
          sort_order: item.sortOrder ?? index + 1,
          is_enabled: true,
          is_archived: false,
          metadata: item.metadata ?? {},
        }));

        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const { error: insertError } = await db
            .from("platform_reference_items" as never)
            .upsert(batch as never, { onConflict: "set_key,code" });
          if (insertError) return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    void seedPromise?.then((seeded) => {
      if (!seeded) seedPromise = null;
    });
  });

  return seedPromise;
}

export { normalizeMarketCode, normalizeMarketCodes } from "@/domain/reference-data/utils";

export const referenceDataService = {
  async ensureSeeded(): Promise<boolean> {
    return ensureSeeded();
  },

  async listSets(): Promise<ReferenceDataSet[]> {
    const seeded = await ensureSeeded();
    if (!seeded) {
      return REFERENCE_DATA_CATALOG.map((set) => ({
        key: set.key,
        name: set.name,
        description: set.description,
        isAdminManaged: true,
      }));
    }

    const supabase = await createClient();
    const { data, error } = await supabase.from("platform_reference_sets" as never).select("*").order("key");
    if (error || !data?.length) {
      return REFERENCE_DATA_CATALOG.map((set) => ({
        key: set.key,
        name: set.name,
        description: set.description,
        isAdminManaged: true,
      }));
    }

    return (data as Array<Record<string, unknown>>).map((row) => ({
      key: row.key as ReferenceSetKey,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      isAdminManaged: Boolean(row.is_admin_managed),
    }));
  },

  async getSetItems(setKey: ReferenceSetKey): Promise<ReferenceDataOption[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("platform_reference_items" as never)
      .select("*")
      .eq("set_key", setKey)
      .eq("is_enabled", true)
      .eq("is_archived", false)
      .order("sort_order", { ascending: true });

    if (!error && data?.length) {
      scheduleSeed();
      return (data as ItemRow[]).map((row) => toOption(mapItem(row)));
    }

    scheduleSeed();
    return getCatalogOptions(setKey);
  },

  async getInstrumentsForMarkets(marketCodes: string[]): Promise<ReferenceDataOption[]> {
    const markets = normalizeMarketCodes(marketCodes);
    if (markets.length === 0) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("platform_reference_items" as never)
      .select("*")
      .eq("set_key", REFERENCE_SET_KEYS.FINANCIAL_INSTRUMENTS)
      .eq("is_enabled", true)
      .eq("is_archived", false)
      .in("parent_code", markets)
      .order("sort_order", { ascending: true });

    if (!error && data?.length) {
      scheduleSeed();
      return (data as ItemRow[]).map((row) => toOption(mapItem(row)));
    }

    scheduleSeed();
    return getCatalogInstrumentsForMarkets(markets);
  },

  async resolveLabel(setKey: ReferenceSetKey, code: string): Promise<string | null> {
    if (!code.trim()) return null;
    const items = await this.getSetItems(setKey);
    const match = items.find((i) => i.code === code);
    if (match) return match.label;

    // Legacy instrument labels stored directly
    if (setKey === REFERENCE_SET_KEYS.FINANCIAL_INSTRUMENTS) {
      const byLabel = items.find(
        (i) => i.label.toLowerCase() === code.toLowerCase()
      );
      if (byLabel) return byLabel.label;
    }

    if (setKey === REFERENCE_SET_KEYS.FINANCIAL_MARKETS) {
      const normalized = normalizeMarketCode(code);
      const market = items.find((i) => i.code === normalized);
      if (market) return market.label;
    }

    return code;
  },

  async resolveLabels(setKey: ReferenceSetKey, codes: string[]): Promise<string[]> {
    const items = await this.getSetItems(setKey);
    const map = new Map(items.map((i) => [i.code, i.label]));
    return codes.map((code) => {
      const normalized =
        setKey === REFERENCE_SET_KEYS.FINANCIAL_MARKETS ? normalizeMarketCode(code) : code;
      return map.get(normalized) ?? code;
    });
  },
};
