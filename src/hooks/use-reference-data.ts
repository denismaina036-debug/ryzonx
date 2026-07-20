"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCatalogInstrumentsForMarkets,
  getCatalogOptions,
} from "@/domain/reference-data/catalog-options";
import type { ReferenceDataOption } from "@/domain/reference-data/types";
import type { ReferenceSetKey } from "@/domain/reference-data/set-keys";
import { normalizeMarketCodes } from "@/domain/reference-data/utils";

const FETCH_TIMEOUT_MS = 8_000;

async function fetchReferenceSet(setKey: ReferenceSetKey): Promise<ReferenceDataOption[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`/api/reference-data/${setKey}`, {
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to load");
    return data.items ?? [];
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useReferenceData(setKey: ReferenceSetKey) {
  const [items, setItems] = useState<ReferenceDataOption[]>(() => getCatalogOptions(setKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextItems = await fetchReferenceSet(setKey);
      if (nextItems.length > 0) setItems(nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setItems((current) => (current.length > 0 ? current : getCatalogOptions(setKey)));
    } finally {
      setLoading(false);
    }
  }, [setKey]);

  useEffect(() => {
    setItems(getCatalogOptions(setKey));
    void reload();
  }, [setKey, reload]);

  return { items, loading, error, reload };
}

export function useInstrumentsForMarkets(marketCodes: string[]) {
  const normalizedMarkets = useMemo(() => normalizeMarketCodes(marketCodes), [marketCodes]);
  const marketsKey = normalizedMarkets.slice().sort().join(",");

  const catalogItems = useMemo(
    () => (marketsKey ? getCatalogInstrumentsForMarkets(normalizedMarkets) : []),
    [marketsKey, normalizedMarkets]
  );

  const [remoteItems, setRemoteItems] = useState<ReferenceDataOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRemoteItems(null);
    setError(null);

    if (!marketsKey) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const needsLoading = catalogItems.length === 0;
    if (needsLoading) setLoading(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    void fetch(`/api/reference-data/instruments?markets=${encodeURIComponent(marketsKey)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load instruments");
        if (!cancelled && data.items?.length) setRemoteItems(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load instruments");
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [marketsKey, catalogItems.length]);

  const items =
    remoteItems && remoteItems.length > 0 ? remoteItems : catalogItems;

  return { items, loading: loading && items.length === 0, error };
}
