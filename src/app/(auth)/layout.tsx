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
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </PublicLayout>
    </LegalLinksProvider>
  );
}
