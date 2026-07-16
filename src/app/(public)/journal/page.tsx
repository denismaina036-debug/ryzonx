import type { Metadata } from "next";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { JournalTable } from "@/features/public/components/journal-table";

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Browse every published trade in the Ryvonx Main Pool with full transparency.",
};

export default function JournalPage() {
  return (
    <SectionContainer className="!py-8 md:!py-12">
      <PageHeader
        title="Trading Journal"
        description="Every trade is verified, published, and available for public review. Full transparency into our trading activity."
      />
      <JournalTable />
    </SectionContainer>
  );
}
