import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components";

export default async function AdminProfilePage() {
  const user = await requireRole(USER_ROLES.ADMINISTRATOR);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Profile"
        description="Your administrator account details."
      />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-navy-500">Name</p>
            <p className="font-medium text-navy-950">{user.fullName}</p>
          </div>
          <div>
            <p className="text-navy-500">Email</p>
            <p className="font-medium text-navy-950">{user.email}</p>
          </div>
          <div>
            <p className="text-navy-500">Role</p>
            <p className="font-medium capitalize text-navy-950">{user.role}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
