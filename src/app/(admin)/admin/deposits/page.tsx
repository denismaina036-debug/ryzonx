import { AdminPageHeader, DepositsTable } from "@/features/admin/components";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { adminService } from "@/services/admin.service";



export default async function AdminDepositsPage() {

  const [all, pending, approved, rejected] = await Promise.all([

    adminService.getDeposits(),

    adminService.getDeposits("pending"),

    adminService.getDeposits("approved"),

    adminService.getDeposits("rejected"),

  ]);



  return (

    <div>

      <AdminPageHeader

        title="Deposits"

        description="Review and approve deposit requests. Approving credits available balance so investors can choose a pool."

      />

      <Tabs defaultValue="pending">

        <TabsList>

          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>

          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>

          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>

          <TabsTrigger value="all">All ({all.length})</TabsTrigger>

        </TabsList>

        <TabsContent value="pending"><DepositsTable deposits={pending} /></TabsContent>

        <TabsContent value="approved"><DepositsTable deposits={approved} /></TabsContent>

        <TabsContent value="rejected"><DepositsTable deposits={rejected} /></TabsContent>

        <TabsContent value="all"><DepositsTable deposits={all} /></TabsContent>

      </Tabs>

    </div>

  );

}

