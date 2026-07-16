import { AdminPageHeader } from "@/features/admin/components";
import { poolCapitalAllocationService } from "@/services/pool-capital-allocation.service";

export default async function AdminCapitalHistoryPage() {
  let history: Awaited<ReturnType<typeof poolCapitalAllocationService.getDashboard>>["recentHistory"] = [];
  try {
    const dash = await poolCapitalAllocationService.getDashboard();
    history = dash.recentHistory;
  } catch {
    history = [];
  }

  return (
    <div>
      <AdminPageHeader title="Allocation History" description="Permanent record of all capital allocation decisions." />
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-navy-500">
              <th className="p-4">Pool</th>
              <th className="p-4">Action</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4">Committee</th>
              <th className="p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b border-border/50">
                <td className="p-4">{h.fundName}</td>
                <td className="p-4 capitalize">{h.action}</td>
                <td className="p-4">${h.amount.toLocaleString()}</td>
                <td className="p-4">{h.status}</td>
                <td className="p-4 text-xs italic text-royal-600">{h.committeeLabel}</td>
                <td className="p-4 text-xs">{new Date(h.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
