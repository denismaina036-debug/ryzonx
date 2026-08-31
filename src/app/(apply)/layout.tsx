import { getInvestorShellProps } from "@/lib/auth/investor-shell-props";
import { AuthProvider } from "@/providers/auth-provider";
import { AuthenticatedShellGate } from "@/components/layouts/authenticated-shell-gate";
import { landingPageService } from "@/services/landing-page.service";

export default async function ApplyRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shellProps, { contact }] = await Promise.all([
    getInvestorShellProps(),
    landingPageService.getRawContent(),
  ]);

  return (
    <AuthProvider user={shellProps.user}>
      <AuthenticatedShellGate shellProps={shellProps} contact={contact}>{children}</AuthenticatedShellGate>
    </AuthProvider>
  );
}
