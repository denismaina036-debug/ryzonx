import { AdminPageHeader } from "@/features/admin/components";
import { CAPITAL_REPORT_LABELS, CAPITAL_REPORT_TYPES } from "@/constants/capital-allocation";

export default function AdminCapitalReportsPage() {
  return (
    <div>
      <AdminPageHeader title="Capital & Growth Reports" description="Export allocation and growth reports." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CAPITAL_REPORT_TYPES.map((type) => (
          <a
            key={type}
            href={`/api/admin/capital-allocation/reports/${type}`}
            className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <p className="font-semibold text-navy-900">{CAPITAL_REPORT_LABELS[type]}</p>
            <p className="mt-1 text-xs text-navy-500">Download CSV</p>
          </a>
        ))}
      </div>
    </div>
  );
}
