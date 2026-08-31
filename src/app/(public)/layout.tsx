import { getInvestorShellProps } from "@/lib/auth/investor-shell-props";
import { AuthProvider } from "@/providers/auth-provider";
import { AuthenticatedShellGate } from "@/components/layouts/authenticated-shell-gate";
import { LegalLinksProvider } from "@/providers/legal-links-provider";
import { getLegalLinksSafe } from "@/lib/legal/links";
import { landingPageService } from "@/services/landing-page.service";

// Public pages include live marketplace and investor data, so render them per request.
export const dynamic = "force-dynamic";

export default async function PublicRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shellProps, legalLinks, { contact }] = await Promise.all([
    getInvestorShellProps(),
    getLegalLinksSafe(),
    landingPageService.getRawContent(),
  ]);

  return (
    <AuthProvider user={shellProps.user}>
      <LegalLinksProvider links={legalLinks}>
        <AuthenticatedShellGate shellProps={shellProps} contact={contact}>
          {children}
        </AuthenticatedShellGate>
      </LegalLinksProvider>
    </AuthProvider>
  );
}
