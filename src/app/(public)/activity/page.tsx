import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { Button } from "@/components/ui/button";
import {
  ActivityFilterTabs,
  TransactionsList,
} from "@/features/public/components/transactions-list";
import { fundService } from "@/services/fund.service";

export const metadata: Metadata = {
  title: "Fund Activity",
  description:
    "View all public deposits and withdrawals in the Ryvonx Main Pool. Investor names are anonymized and participation is optional.",
};

interface ActivityPageProps {
  searchParams: Promise<{
    type?: string;
    page?: string;
  }>;
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const params = await searchParams;
  const type =
    params.type === "deposit" || params.type === "withdrawal"
      ? params.type
      : "all";
  const page = Math.max(1, Number(params.page) || 1);

  const { data, pagination } = await fundService.getAllTransactions(undefined, {
    page,
    pageSize: 20,
    type,
  });

  return (
    <SectionContainer className="!py-8 md:!py-12">
      <PageHeader
        title="Fund Activity"
        description="All public deposits and withdrawals. Investors choose whether their activity is shown. Names are anonymized for privacy."
        actions={<ActivityFilterTabs current={type} />}
      />

      <TransactionsList items={data} />

      {pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm text-navy-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total}{" "}
            transactions
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={{
                    pathname: "/activity",
                    query: {
                      ...(type !== "all" ? { type } : {}),
                      page: pagination.page - 1,
                    },
                  }}
                >
                  Previous
                </Link>
              </Button>
            )}
            {pagination.page < pagination.totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={{
                    pathname: "/activity",
                    query: {
                      ...(type !== "all" ? { type } : {}),
                      page: pagination.page + 1,
                    },
                  }}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </SectionContainer>
  );
}
