import Link from "next/link";
import { FileText, Trophy, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPoolManagersShell } from "@/features/admin/components/admin-pool-managers-shell";
import {
  adminPoolManagersApplicationsPath,
  ROUTES,
} from "@/constants/routes";

interface AdminPoolManagersOverviewProps {
  pendingApplications: number;
  approvedApplications: number;
  activeManagers: number;
  challengeEnrollments: number;
}

export function AdminPoolManagersOverview({
  pendingApplications,
  approvedApplications,
  activeManagers,
  challengeEnrollments,
}: AdminPoolManagersOverviewProps) {
  const cards = [
    {
      label: "Pending Applications",
      value: pendingApplications,
      href: adminPoolManagersApplicationsPath("pending"),
      icon: FileText,
      accent: "text-royal-600 bg-royal-50",
      urgent: pendingApplications > 0,
    },
    {
      label: "Approved Managers",
      value: approvedApplications,
      href: adminPoolManagersApplicationsPath("approved"),
      icon: Users,
      accent: "text-emerald-600 bg-emerald-50",
      urgent: false,
    },
    {
      label: "Active Managers",
      value: activeManagers,
      href: ROUTES.adminPoolManagersManagers,
      icon: Users,
      accent: "text-navy-600 bg-navy-50",
      urgent: false,
    },
    {
      label: "Challenge Enrollments",
      value: challengeEnrollments,
      href: ROUTES.adminPoolManagersChallenges,
      icon: Trophy,
      accent: "text-amber-600 bg-amber-50",
      urgent: false,
    },
    {
      label: "Development Programs",
      value: activeManagers,
      href: ROUTES.adminPoolManagersDevelopment,
      icon: TrendingUp,
      accent: "text-violet-600 bg-violet-50",
      urgent: false,
    },
  ];

  return (
    <AdminPoolManagersShell
      title="Pool Managers Overview"
      description="Applications, challenges, career development, and content approval for every pool manager on the platform."
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
                      <p className="mt-1 text-xs font-medium text-gold-700">Awaiting review</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </AdminPoolManagersShell>
  );
}
