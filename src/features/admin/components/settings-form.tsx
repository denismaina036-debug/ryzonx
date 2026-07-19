"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformSetting } from "@/features/admin/types";

export function SettingsForm({ settings: initial }: { settings: PlatformSetting[] }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);

  const groups = [...new Set(settings.map((s) => s.group))];

  function updateValue(key: string, value: string) {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: settings.map((s) => ({ key: s.key, value: s.value })),
        }),
      });
      const json = (await res.json()) as { settings?: PlatformSetting[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      if (json.settings) setSettings(json.settings);
      toast.success("Platform settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base">{group}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {settings
              .filter((s) => s.group === group)
              .map((setting) => (
                <div key={setting.key} className="space-y-2">
                  <Label htmlFor={setting.key}>{setting.label}</Label>
                  <Input
                    id={setting.key}
                    value={setting.value}
                    onChange={(e) => updateValue(setting.key, e.target.value)}
                    placeholder={setting.label}
                  />
                </div>
              ))}
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
