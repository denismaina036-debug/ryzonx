import { redirect } from "next/navigation";

export default async function AdminManagerDevelopmentDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/pool-managers/development/${id}`);
}
