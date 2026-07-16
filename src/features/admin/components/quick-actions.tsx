"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Megaphone,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";

const QUICK_ACTIONS = [
  { label: "Add Trade", href: ROUTES.adminTrades, icon: Plus, variant: "default" as const },
  { label: "Approve Deposits", href: ROUTES.adminDeposits, icon: ArrowDownToLine, variant: "success" as const },
  { label: "Approve Withdrawals", href: ROUTES.adminWithdrawals, icon: ArrowUpFromLine, variant: "outline" as const },
  { label: "Update Pool Value", href: ROUTES.adminPerformance, icon: Wallet, variant: "outline" as const },
  { label: "Publish Announcement", href: ROUTES.adminAnnouncements, icon: Megaphone, variant: "secondary" as const },
];

export function AdminQuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button key={action.label} asChild variant={action.variant} size="sm">
                <Link href={action.href}>
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Link>
              </Button>
            );
          })}
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.adminSnapshots}>
              <TrendingUp className="h-4 w-4" />
              Close Trading Day
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
