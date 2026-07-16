import { DEFAULT_FUND_ID } from "@/constants/funds";
import {
  mockFund,
  mockFundStats,
  mockPerformanceHistory,
  mockTrades,
  mockRecentDeposits,
  mockRecentWithdrawals,
  mockRecentInvestors,
  mockInvestorStats,
  mockFaqItems,
  mockTestimonials,
  mockPerformanceSummary,
} from "@/lib/mock-data";
import type {
  Fund,
  FundStats,
  PerformanceSnapshot,
  Trade,
  ActivityItem,
  InvestorStats,
  FaqItem,
  Testimonial,
  PaginatedResponse,
  PerformancePeriod,
  PerformanceSummary,
} from "@/types";

function getPublicTransactions(
  fundId: string = DEFAULT_FUND_ID
): ActivityItem[] {
  return [...mockRecentDeposits, ...mockRecentWithdrawals]
    .filter(
      (item) =>
        item.fundId === fundId &&
        item.isPublic &&
        (item.type === "deposit" || item.type === "withdrawal")
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/**
 * Fund-aware public data service.
 * Uses mock data by default; swap to Supabase queries when connected.
 */
export const fundService = {
  async getDefaultFund(): Promise<Fund> {
    return mockFund;
  },

  async getFundBySlug(slug: string): Promise<Fund | null> {
    if (slug === mockFund.slug) return mockFund;
    return null;
  },

  async getStats(fundId: string = DEFAULT_FUND_ID): Promise<FundStats> {
    if (fundId !== DEFAULT_FUND_ID) throw new Error("Fund not found");
    return mockFundStats;
  },

  async getPerformanceHistory(
    fundId: string = DEFAULT_FUND_ID,
    period: PerformancePeriod = "daily"
  ): Promise<PerformanceSnapshot[]> {
    const all = mockPerformanceHistory.filter((p) => p.fundId === fundId);
    switch (period) {
      case "daily":
        return all.slice(-30);
      case "weekly": {
        return all.filter((_, i) => i % 7 === 0).slice(-52);
      }
      case "monthly": {
        return all.filter((_, i) => i % 30 === 0).slice(-12);
      }
      case "yearly":
        return all.filter((_, i) => i % 90 === 0).slice(-5);
      default:
        return all.slice(-30);
    }
  },

  async getPerformanceSummary(
    fundId: string = DEFAULT_FUND_ID
  ): Promise<PerformanceSummary> {
    if (fundId !== DEFAULT_FUND_ID) throw new Error("Fund not found");
    return mockPerformanceSummary;
  },

  async getTrades(
    fundId: string = DEFAULT_FUND_ID,
    options?: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      direction?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ): Promise<PaginatedResponse<Trade>> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    let filtered = mockTrades.filter((t) => t.fundId === fundId);

    if (options?.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter((t) => t.symbol.toLowerCase().includes(q));
    }
    if (options?.status && options.status !== "all") {
      filtered = filtered.filter((t) => t.status === options.status);
    }
    if (options?.direction && options.direction !== "all") {
      filtered = filtered.filter((t) => t.direction === options.direction);
    }

    const sortBy = options?.sortBy ?? "closedAt";
    const sortOrder = options?.sortOrder ?? "desc";
    filtered.sort((a, b) => {
      const aVal = a[sortBy as keyof Trade];
      const bVal = b[sortBy as keyof Trade];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortOrder === "asc" ? cmp : -cmp;
    });

    const from = (page - 1) * pageSize;
    const data = filtered.slice(from, from + pageSize);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
    };
  },

  async getRecentTrades(
    fundId: string = DEFAULT_FUND_ID,
    limit = 5
  ): Promise<Trade[]> {
    return mockTrades
      .filter((t) => t.fundId === fundId && t.status === "closed")
      .slice(0, limit);
  },

  async getRecentDeposits(
    fundId: string = DEFAULT_FUND_ID,
    limit = 6
  ): Promise<ActivityItem[]> {
    return mockRecentDeposits
      .filter((d) => d.fundId === fundId && d.isPublic)
      .slice(0, limit);
  },

  async getRecentWithdrawals(
    fundId: string = DEFAULT_FUND_ID,
    limit = 6
  ): Promise<ActivityItem[]> {
    return mockRecentWithdrawals
      .filter((w) => w.fundId === fundId && w.isPublic)
      .slice(0, limit);
  },

  async getRecentTransactions(
    fundId: string = DEFAULT_FUND_ID,
    limit = 5
  ): Promise<ActivityItem[]> {
    return getPublicTransactions(fundId).slice(0, limit);
  },

  async getAllTransactions(
    fundId: string = DEFAULT_FUND_ID,
    options?: {
      page?: number;
      pageSize?: number;
      type?: "all" | "deposit" | "withdrawal";
    }
  ): Promise<PaginatedResponse<ActivityItem>> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    let filtered = getPublicTransactions(fundId);

    if (options?.type && options.type !== "all") {
      filtered = filtered.filter((item) => item.type === options.type);
    }

    const from = (page - 1) * pageSize;
    const data = filtered.slice(from, from + pageSize);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
    };
  },

  async getRecentInvestors(
    fundId: string = DEFAULT_FUND_ID,
    limit = 6
  ): Promise<ActivityItem[]> {
    return mockRecentInvestors
      .filter((i) => i.fundId === fundId)
      .slice(0, limit);
  },

  async getInvestorStats(
    fundId: string = DEFAULT_FUND_ID
  ): Promise<InvestorStats> {
    if (fundId !== DEFAULT_FUND_ID) throw new Error("Fund not found");
    return mockInvestorStats;
  },

  async getFaqItems(): Promise<FaqItem[]> {
    return mockFaqItems.filter((f) => f.isPublished);
  },

  async getTestimonials(): Promise<Testimonial[]> {
    return mockTestimonials;
  },
};
