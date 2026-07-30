import { getSiteStructuredData } from "@/lib/seo/structured-data";

/** Global Organization + WebSite JSON-LD (render once in root layout). */
export function SiteJsonLd() {
  const graphs = getSiteStructuredData();
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graphs) }}
    />
  );
}
