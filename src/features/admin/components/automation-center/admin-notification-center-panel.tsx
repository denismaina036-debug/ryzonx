"use client";

import Link from "next/link";
import { AutomationCenterShell } from "./automation-center-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export function AdminNotificationCenterPanel() {
  return (
    <AutomationCenterShell
      title="Notification Center"
      description="Event-driven notifications are queued before delivery. Manage templates and communication history in Communication Center."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Queue & Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-navy-600">
              Monitor pending and failed notification queue items, retry deliveries, and process queues manually.
            </p>
            <Button asChild>
              <Link href={ROUTES.adminAutomationQueue}>Open Queue Monitor</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-navy-600">
              Automation rules reference communication templates for in-app and email delivery.
            </p>
            <Button variant="outline" asChild>
              <Link href={ROUTES.adminCommunicationTemplates}>Manage Templates</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AutomationCenterShell>
  );
}
