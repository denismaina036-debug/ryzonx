"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformSetting } from "@/features/admin/types";

export function SettingsForm({ settings }: { settings: PlatformSetting[] }) {
  const groups = [...new Set(settings.map((s) => s.group))];

  const handleSave = () => {
    toast.success("Settings saved", {
      description: "Connect to Supabase platform_settings to persist.",
    });
  };

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
                    defaultValue={setting.value}
                    placeholder={setting.label}
                  />
                </div>
              ))}
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  );
}
