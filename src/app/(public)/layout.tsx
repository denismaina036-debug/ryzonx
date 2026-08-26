import { getInvestorShellProps } from "@/lib/auth/investor-shell-props";
import { AuthProvider } from "@/providers/auth-provider";
import { AuthenticatedShellGate } from "@/components/layouts/authenticated-shell-gate";
import { LegalLinksProvider } from "@/providers/legal-links-provider";
import { getLegalLinksSafe } from "@/lib/legal/links";

// Public pages include live marketplace and investor data, so render them per request.
export const dynamic = "force-dynamic";

export default async function PublicRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shellProps, legalLinks] = await Promise.all([
    getInvestorShellProps(),
    getLegalLinksSafe(),
  ]);

  return (
    <AuthProvider user={shellProps.user}>
      <LegalLinksProvider links={legalLinks}>
        <AuthenticatedShellGate shellProps={shellProps}>
          {children}
        </AuthenticatedShellGate>
      </LegalLinksProvider>
    </AuthProvider>
  );
}
