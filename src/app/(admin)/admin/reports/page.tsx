import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components";

const REPORT_TYPES = [
  "Investor Reports",
  "Fund Reports",
  "Deposit Reports",
  "Withdrawal Reports",
  "Trading Reports",
  "Daily Snapshot Reports",
  "Performance Reports",
];

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reports"
        description="Generate and export downloadable reports in PDF, CSV, and Excel formats."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((report) => (
          <Card key={report}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{report}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button size="sm" variant="outline">PDF</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
