import { PublicLayout } from "@/components/layouts/public-layout";

/**
 * Auth route group layout (login, register, forgot-password).
 * Uses public layout without requiring authentication.
 */
export default function AuthRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicLayout>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </PublicLayout>
  );
}
