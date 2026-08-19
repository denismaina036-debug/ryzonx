import type { Metadata } from "next";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { JournalTable } from "@/features/public/components/journal-table";
import { ROUTES } from "@/constants/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { publicJournalService } from "@/services/public-journal.service";

export const metadata: Metadata = buildPageMetadata({
  title: "Recent Pool Trades",
  description:
    "Browse recent published pool trades on RyvonX with full transparency into trading activity and results.",
  path: ROUTES.journal,
  keywords: ["pool trades", "trading journal", "trade history", "transparent trading", "RyvonX"],
});

export default async function JournalPage() {
  const trades = await publicJournalService.listTrades();

  return (
    <SectionContainer className="!py-8 md:!py-12">
      <PageHeader
        title="Recent Pool Trades"
        description="Recent published trades from active pool cycles, verified and attributed to their pool managers."
      />
      <JournalTable trades={trades} />
    </SectionContainer>
  );
}
