import { AdminPageHeader, AuditLogsTable } from "@/features/admin/components";
import { adminService } from "@/services/admin.service";

export default async function AdminAuditLogsPage() {
  const logs = await adminService.getAuditLogs();

  return (
    <div>
      <AdminPageHeader
        title="Audit Logs"
        description="Immutable record of every administrative action. Important records are never permanently deleted."
      />
      <AuditLogsTable logs={logs} />
    </div>
  );
}
