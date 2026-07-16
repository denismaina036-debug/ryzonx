import { AdminPageHeader, WithdrawalsTable } from "@/features/admin/components";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { adminService } from "@/services/admin.service";



export default async function AdminWithdrawalsPage() {

  const [all, pending, approved, rejected] = await Promise.all([

    adminService.getWithdrawals(),

    adminService.getWithdrawals("pending"),

    adminService.getWithdrawals("approved"),

    adminService.getWithdrawals("rejected"),

  ]);



  return (

    <div>

      <AdminPageHeader

        title="Withdrawals"

        description="Review and approve withdrawal requests. Approving deducts from available balance."

      />

      <Tabs defaultValue="pending">

        <TabsList>

          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>

          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>

          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>

          <TabsTrigger value="all">All ({all.length})</TabsTrigger>

        </TabsList>

        <TabsContent value="pending">

          <WithdrawalsTable withdrawals={pending} />

        </TabsContent>

        <TabsContent value="approved">

          <WithdrawalsTable withdrawals={approved} />

        </TabsContent>

        <TabsContent value="rejected">

          <WithdrawalsTable withdrawals={rejected} />

        </TabsContent>

        <TabsContent value="all">

          <WithdrawalsTable withdrawals={all} />

        </TabsContent>

      </Tabs>

    </div>

  );

}

