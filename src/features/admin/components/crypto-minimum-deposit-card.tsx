"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CryptoMinimumDepositCard({ initialMinimum }: { initialMinimum: number }) {
  const [minimum, setMinimum] = useState(String(initialMinimum));
  const [saving, setSaving] = useState(false);

  async function save() {
    const value = Number(minimum);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a minimum deposit greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [{ key: "crypto_min_deposit_usd", value }],
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save crypto minimum.");
      toast.success("Crypto minimum deposit updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save crypto minimum.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Crypto deposit minimum</CardTitle>
        <CardDescription>
          This USD minimum applies to every supported crypto wallet and network.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="w-full max-w-xs space-y-2">
          <Label htmlFor="crypto-minimum-deposit">Minimum deposit (USD)</Label>
          <Input
            id="crypto-minimum-deposit"
            type="number"
            min="0.01"
            step="0.01"
            value={minimum}
            onChange={(event) => setMinimum(event.target.value)}
          />
        </div>
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving || !minimum || Number(minimum) <= 0}
        >
          {saving ? "Saving…" : "Save Minimum"}
        </Button>
      </CardContent>
    </Card>
  );
}
