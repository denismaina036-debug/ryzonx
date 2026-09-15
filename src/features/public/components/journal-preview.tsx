import { copyTradingText } from "@/lib/copy-trading-presentation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { ROUTES } from "@/constants/routes";
import { landingPageService } from "@/services/landing-page.service";
import { publicJournalService } from "@/services/public-journal.service";
import {
  JournalTradeTableRow,
  JournalTradesEmptyState,
} from "@/features/public/components/journal-trade-row";

export async function JournalPreviewSection() {
  const [trades, content] = await Promise.all([
    publicJournalService.listRecent(5).catch((error: unknown) => {
      console.warn(
        "[landing] recent trades unavailable — showing empty journal preview.",
        error instanceof Error ? error.message : "Unknown error"
      );
      return [];
    }),
    landingPageService.getPublicContent(),
  ]);

  return (
    <SectionContainer landingMobile>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          badge={copyTradingText(content.copy.journal.badge)}
          title={copyTradingText(content.copy.journal.title)}
          description={copyTradingText(content.copy.journal.description)}
          className="mb-0"
        />
        <Button asChild variant="outline">
          <Link href={ROUTES.journal}>
            {copyTradingText(content.copy.journal.viewAllLabel)}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-8 overflow-x-auto">
        {trades.length === 0 ? (
          <JournalTradesEmptyState message="Published strategy cycle trades will appear here as verified traders record them." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Verified Trader</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Profit / Loss</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <JournalTradeTableRow key={trade.id} trade={trade} variant="preview" />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </SectionContainer>
  );
}
