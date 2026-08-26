import { PublicLayout } from "@/components/layouts/public-layout";
import { LegalLinksProvider } from "@/providers/legal-links-provider";
import { getLegalLinksSafe } from "@/lib/legal/links";

/**
 * Auth route group layout (login, register, forgot-password).
 * Uses public layout without requiring authentication.
 */
export default async function AuthRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const legalLinks = await getLegalLinksSafe();

  return (
    <LegalLinksProvider links={legalLinks}>
      <PublicLayout>
        <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,.1),transparent_28rem),radial-gradient(circle_at_85%_85%,rgba(99,102,241,.08),transparent_30rem)] px-6 py-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" aria-hidden />
          <div className="w-full max-w-md">{children}</div>
        </div>
      </PublicLayout>
    </LegalLinksProvider>
  );
}
