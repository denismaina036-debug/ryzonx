import { getInvestorShellProps } from "@/lib/auth/investor-shell-props";
import { AuthProvider } from "@/providers/auth-provider";
import { AuthenticatedShellGate } from "@/components/layouts/authenticated-shell-gate";
import { LandingContentProvider } from "@/providers/landing-content-provider";
import { landingPageService } from "@/services/landing-page.service";

export default async function PublicRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shellProps, landingContent] = await Promise.all([
    getInvestorShellProps(),
    landingPageService.getPublicContent(),
  ]);

  return (
    <AuthProvider user={shellProps.user}>
      <LandingContentProvider content={landingContent}>
        <AuthenticatedShellGate shellProps={shellProps}>
          {children}
        </AuthenticatedShellGate>
      </LandingContentProvider>
    </AuthProvider>
  );
}
