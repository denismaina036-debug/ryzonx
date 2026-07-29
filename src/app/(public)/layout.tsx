import { getInvestorShellProps } from "@/lib/auth/investor-shell-props";
import { AuthProvider } from "@/providers/auth-provider";
import { AuthenticatedShellGate } from "@/components/layouts/authenticated-shell-gate";
import { LandingContentProvider } from "@/providers/landing-content-provider";
import { LegalLinksProvider } from "@/providers/legal-links-provider";
import { getLegalLinksSafe } from "@/lib/legal/links";
import { landingPageService } from "@/services/landing-page.service";

export default async function PublicRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shellProps, landingContent, legalLinks] = await Promise.all([
    getInvestorShellProps(),
    landingPageService.getPublicContent(),
    getLegalLinksSafe(),
  ]);

  return (
    <AuthProvider user={shellProps.user}>
      <LandingContentProvider content={landingContent}>
        <LegalLinksProvider links={legalLinks}>
          <AuthenticatedShellGate shellProps={shellProps}>
            {children}
          </AuthenticatedShellGate>
        </LegalLinksProvider>
      </LandingContentProvider>
    </AuthProvider>
  );
}
