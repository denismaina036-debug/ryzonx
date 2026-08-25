import type { Metadata, Viewport } from "next";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/constants/brand";
import { ROOT_SITE_METADATA } from "@/lib/seo/metadata";
import { SiteJsonLd } from "@/components/seo/site-json-ld";
import "@/styles/globals.css";

export const metadata: Metadata = {
  ...ROOT_SITE_METADATA,
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1929" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen overflow-x-hidden bg-background font-sans antialiased">
        <SiteJsonLd />
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
