import type { Metadata } from "next";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { APP_NAME, APP_DESCRIPTION } from "@/constants/routes";
import { resolveMetadataBaseUrl } from "@/lib/app-url";
import { CANONICAL_SITE_URL } from "@/constants/site";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  metadataBase: new URL(resolveMetadataBaseUrl()),
  alternates: {
    canonical: CANONICAL_SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
