"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface ProfileEditorProps {
  initialBio: string;
  initialTradingStyle: string;
  initialMarkets: string;
}

export function PoolManagerProfileEditor({
  initialBio,
  initialTradingStyle,
  initialMarkets,
}: ProfileEditorProps) {
  const [bio, setBio] = useState(initialBio);
  const [tradingStyle, setTradingStyle] = useState(initialTradingStyle);
  const [markets, setMarkets] = useState(initialMarkets);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pool-manager/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          tradingStyle,
          markets: markets.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Profile updated");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label className="text-xs text-navy-400">Biography</label>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
          className="mt-1 border-white/10 bg-white/[0.03]"
        />
      </div>
      <div>
        <label className="text-xs text-navy-400">Trading Style</label>
        <Input
          value={tradingStyle}
          onChange={(e) => setTradingStyle(e.target.value)}
          className="mt-1 border-white/10 bg-white/[0.03]"
        />
      </div>
      <div>
        <label className="text-xs text-navy-400">Markets (comma-separated)</label>
        <Input
          value={markets}
          onChange={(e) => setMarkets(e.target.value)}
          className="mt-1 border-white/10 bg-white/[0.03]"
        />
      </div>
      {message && <p className="text-sm text-amber-200">{message}</p>}
      <Button
        onClick={save}
        disabled={loading}
        className="bg-amber-500 text-black hover:bg-amber-400"
      >
        {loading ? "Saving…" : "Save Profile"}
      </Button>
      <div>
        <Link href={ROUTES.poolManager} className="text-sm text-amber-300/80">
          ← Overview
        </Link>
      </div>
    </div>
  );
}
