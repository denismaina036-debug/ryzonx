import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPageHeader } from "@/features/admin/components";
import { adminService } from "@/services/admin.service";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export default async function AdminPerformancePage() {
  const stats = await adminService.getDashboardStats();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Performance"
        description="Update pool value, ROI metrics, and performance statistics displayed across the platform."
        actions={<Button size="sm">Save Changes</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pool Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Pool Value</Label>
              <Input defaultValue={stats.totalPoolValue} type="number" />
            </div>
            <div className="space-y-2">
              <Label>Assets Under Management</Label>
              <Input defaultValue={stats.assetsUnderManagement} type="number" />
            </div>
            <div className="space-y-2">
              <Label>Win Rate (%)</Label>
              <Input defaultValue={stats.winRate} type="number" />
            </div>
            <div className="space-y-2">
              <Label>Active Investors</Label>
              <Input defaultValue={stats.activeInvestors} type="number" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ROI Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Daily ROI (%)</Label>
              <Input defaultValue={stats.dailyRoi} type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Monthly ROI (%)</Label>
              <Input defaultValue={stats.monthlyRoi} type="number" step="0.01" />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Values</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-navy-500">Pool Value</p>
            <p className="font-mono text-lg font-semibold">{formatCurrency(stats.totalPoolValue)}</p>
          </div>
          <div>
            <p className="text-xs text-navy-500">Daily ROI</p>
            <p className="font-mono text-lg font-semibold">{formatPercentage(stats.dailyRoi)}</p>
          </div>
          <div>
            <p className="text-xs text-navy-500">Monthly ROI</p>
            <p className="font-mono text-lg font-semibold">{formatPercentage(stats.monthlyRoi)}</p>
          </div>
          <div>
            <p className="text-xs text-navy-500">Win Rate</p>
            <p className="font-mono text-lg font-semibold">{stats.winRate}%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
