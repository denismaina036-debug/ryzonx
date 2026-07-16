import { getInvestorShellProps } from "@/lib/auth/investor-shell-props";
import { AuthProvider } from "@/providers/auth-provider";
import { AuthenticatedShellGate } from "@/components/layouts/authenticated-shell-gate";

export default async function ApplyRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shellProps = await getInvestorShellProps();

  return (
    <AuthProvider user={shellProps.user}>
      <AuthenticatedShellGate shellProps={shellProps}>{children}</AuthenticatedShellGate>
    </AuthProvider>
  );
}
