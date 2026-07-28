import { AdminPageHeader } from "@/features/admin/components";
import { AdminLandingPageClient } from "@/features/admin/components/admin-landing-page-client";
import { landingPageService } from "@/services/landing-page.service";

export default async function AdminLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "hero" } = await searchParams;
  const content = await landingPageService.getAdminContent();

  return (
    <div>
      <AdminPageHeader
        title="Landing Page"
        description="Manage homepage hero, statistics, sections, contact info, footer, social links, and SEO."
      />
      <AdminLandingPageClient initial={content} activeTab={tab} />
    </div>
  );
}
