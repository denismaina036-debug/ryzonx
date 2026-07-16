"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { POOL_LIFECYCLE_LABELS } from "@/constants/pool-lifecycle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import type { Pool } from "@/domain/pools/types";

interface PoolManagerPoolsClientProps {
  initialPools: Pool[];
}

export function PoolManagerPoolsClient({ initialPools }: PoolManagerPoolsClientProps) {
  const router = useRouter();
  const [pools, setPools] = useState(initialPools);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pool-manager/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setCreating(false);
      setName("");
      setDescription("");
      router.refresh();
      const listRes = await fetch("/api/pool-manager/pools");
      const listData = await listRes.json();
      if (listData.pools) setPools(listData.pools);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitPool(poolId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pool-manager/pools/${poolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submit: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      router.refresh();
      const listRes = await fetch("/api/pool-manager/pools");
      const listData = await listRes.json();
      if (listData.pools) setPools(listData.pools);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/80">
            Pool Management
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">My Pools</h1>
          <p className="mt-2 text-sm text-navy-400">
            Create pool proposals and submit them for RyvonX approval. You cannot
            approve your own pools.
          </p>
        </div>
        <Button
          className="bg-amber-500 text-black hover:bg-amber-400"
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? "Cancel" : "New Pool Proposal"}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {creating && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-white">New Pool Proposal</h2>
          <div>
            <label className="text-xs text-navy-400">Pool Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 border-white/10 bg-white/[0.03]"
            />
          </div>
          <div>
            <label className="text-xs text-navy-400">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 border-white/10 bg-white/[0.03]"
            />
          </div>
          <Button type="submit" disabled={loading} className="bg-amber-500 text-black">
            {loading ? "Creating…" : "Save Draft"}
          </Button>
        </form>
      )}

      <div className="space-y-4">
        {pools.length === 0 ? (
          <p className="text-sm text-navy-500">No pools yet.</p>
        ) : (
          pools.map((pool) => {
            const lifecycle = pool.lifecycleStatus ?? "draft";
            const label = POOL_LIFECYCLE_LABELS[lifecycle] ?? lifecycle;
            return (
              <div
                key={pool.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{pool.name}</h3>
                    <p className="mt-1 text-sm text-navy-400">{pool.description || "—"}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-navy-500">
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-1 capitalize">
                        {label}
                      </span>
                      <span>Min {formatCurrency(pool.minInvestment)}</span>
                    </div>
                  </div>
                  {lifecycle === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      className="border-amber-500/30 text-amber-200"
                      onClick={() => submitPool(pool.id)}
                    >
                      Submit for Review
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Link href={ROUTES.poolManager} className="text-sm text-amber-300/80 hover:text-amber-200">
        ← Back to overview
      </Link>
    </div>
  );
}
