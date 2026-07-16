import { AdminTradesView } from "@/features/admin/components";
import { adminService } from "@/services/admin.service";
import { poolAdminService } from "@/services/pool-admin.service";

export default async function AdminTradesPage() {
  const [trades, funds] = await Promise.all([
    adminService.getTrades(),
    poolAdminService.getFunds(),
  ]);

  return <AdminTradesView trades={trades} funds={funds} />;
}
