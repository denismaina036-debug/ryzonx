import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Bitcoin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminFinanceShell } from "@/features/admin/components/admin-finance-shell";
import {
  adminFinanceDepositsPath,
  adminFinanceWithdrawalsPath,
  ROUTES,
} from "@/constants/routes";

interface AdminFinanceOverviewProps {
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalDeposits: number;
  totalWithdrawals: number;
  activeWallets: number;
}

export function AdminFinanceOverview({
  pendingDeposits,
  pendingWithdrawals,
  totalDeposits,
  totalWithdrawals,
  activeWallets,
}: AdminFinanceOverviewProps) {
  const cards = [
    {
      label: "Pending Deposits",
      value: pendingDeposits,
      href: adminFinanceDepositsPath("pending"),
      icon: ArrowDownToLine,
      accent: "text-emerald-600 bg-emerald-50",
      urgent: pendingDeposits > 0,
    },
    {
      label: "Pending Withdrawals",
      value: pendingWithdrawals,
      href: adminFinanceWithdrawalsPath("pending"),
      icon: ArrowUpFromLine,
      accent: "text-amber-600 bg-amber-50",
      urgent: pendingWithdrawals > 0,
    },
    {
      label: "Total Deposits",
      value: totalDeposits,
      href: adminFinanceDepositsPath("all"),
      icon: ArrowDownToLine,
      accent: "text-navy-600 bg-navy-50",
      urgent: false,
    },
    {
      label: "Total Withdrawals",
      value: totalWithdrawals,
      href: adminFinanceWithdrawalsPath("all"),
      icon: ArrowUpFromLine,
      accent: "text-navy-600 bg-navy-50",
      urgent: false,
    },
    {
      label: "Active Wallets",
      value: activeWallets,
      href: ROUTES.adminFinanceWallets,
      icon: Bitcoin,
      accent: "text-royal-600 bg-royal-50",
      urgent: false,
    },
  ];

  return (
    <AdminFinanceShell
      title="Finance Overview"
      description="Deposits, withdrawals, and crypto wallet configuration — everything that moves capital in and out of Ryvonx."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href}>
              <Card
                className={`h-full transition hover:border-royal-200 hover:shadow-md ${
                  card.urgent ? "border-gold-300 ring-1 ring-gold-200" : ""
                }`}
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <div className={`rounded-xl p-2.5 ${card.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-navy-500">{card.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-navy-950">{card.value}</p>
                    {card.urgent && (
                      <p className="mt-1 text-xs font-medium text-gold-700">Requires review</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </AdminFinanceShell>
  );
}
