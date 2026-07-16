import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "./admin-page-header";

interface AdminModuleShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  comingSoon?: boolean;
}

export function AdminModuleShell({
  title,
  description,
  actions,
  children,
  comingSoon,
}: AdminModuleShellProps) {
  return (
    <div>
      <AdminPageHeader title={title} description={description} actions={actions} />
      {children ?? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium text-navy-950">
              {comingSoon ? "Module scaffolded" : "No data yet"}
            </p>
            <p className="mt-2 text-sm text-navy-500">
              This module is ready for Supabase integration. UI and navigation are in place.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
