import { AdminPageHeader } from "@/features/admin/components";
import { GOVERNANCE_REPORT_LABELS, GOVERNANCE_REPORT_TYPES } from "@/constants/governance";

export default function AdminGovernanceReportsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Governance Reports"
        description="Export governance history, violations, and pool health trends."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GOVERNANCE_REPORT_TYPES.map((type) => (
          <a
            key={type}
            href={`/api/admin/governance/reports/${type}`}
            className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <p className="font-semibold text-navy-900">
              {GOVERNANCE_REPORT_LABELS[type] ?? type}
            </p>
            <p className="mt-1 text-xs text-navy-500">Download CSV</p>
          </a>
        ))}
      </div>
    </div>
  );
}
