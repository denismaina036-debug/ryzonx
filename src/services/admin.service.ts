import { transactionService } from "@/services/transaction.service";
import { poolAdminService } from "@/services/pool-admin.service";
import { tradeAdminService } from "@/services/trade-admin.service";
import {
  mockAdminAnnouncements,
  mockAdminDashboardStats,
  mockAdminFunds,
  mockAdminInvestors,
  mockAdminTestimonials,
  mockAdminTrades,
  mockAuditLogs,
  mockDailyRoiTrend,
  mockDailySnapshots,
  mockDepositTrend,
  mockInvestmentTrend,
  mockPlatformSettings,
  mockPoolGrowthTrend,
  mockWithdrawalTrend,
} from "@/lib/mock-data/admin";
import type {
  AdminAnnouncement,
  AdminDashboardStats,
  AdminDepositRequest,
  AdminFund,
  AdminInvestor,
  AdminTestimonial,
  AdminTrade,
  AdminTransaction,
  AdminTrendPoint,
  AdminWithdrawalRequest,
  AuditLogEntry,
  DailyFundSnapshot,
  PlatformSetting,
} from "@/features/admin/types";
import type { FaqItem, PaginatedResponse, TransactionStatus } from "@/types";
import { mockFaqItems } from "@/lib/mock-data";

/**
 * Admin data service — mock-backed, Supabase-ready.
 * All admin portal reads flow through here.
 */
export const adminService = {
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const counts = await transactionService.getPendingCounts();
    return {
      ...mockAdminDashboardStats,
      pendingDeposits: counts.pendingDeposits,
      pendingWithdrawals: counts.pendingWithdrawals,
    };
  },

  async getPoolGrowthTrend(): Promise<AdminTrendPoint[]> {
    return mockPoolGrowthTrend;
  },

  async getDepositTrend(): Promise<AdminTrendPoint[]> {
    return mockDepositTrend;
  },

  async getWithdrawalTrend(): Promise<AdminTrendPoint[]> {
    return mockWithdrawalTrend;
  },

  async getInvestmentTrend(): Promise<AdminTrendPoint[]> {
    return mockInvestmentTrend;
  },

  async getDailyRoiTrend(): Promise<AdminTrendPoint[]> {
    return mockDailyRoiTrend;
  },

  async getFunds(): Promise<AdminFund[]> {
    return poolAdminService.getFunds();
  },

  async getFundById(id: string): Promise<AdminFund | null> {
    const funds = await poolAdminService.getFunds();
    return funds.find((f) => f.id === id) ?? mockAdminFunds.find((f) => f.id === id) ?? null;
  },

  async getDeposits(status?: TransactionStatus): Promise<AdminDepositRequest[]> {
    return transactionService.getAdminDeposits(status);
  },

  async getWithdrawals(status?: TransactionStatus): Promise<AdminWithdrawalRequest[]> {
    return transactionService.getAdminWithdrawals(status);
  },

  async getInvestors(): Promise<AdminInvestor[]> {
    return mockAdminInvestors;
  },

  async getTrades(): Promise<AdminTrade[]> {
    try {
      const trades = await tradeAdminService.getTrades();
      return trades.length > 0 ? trades : mockAdminTrades;
    } catch {
      return mockAdminTrades;
    }
  },

  async getDailySnapshots(): Promise<DailyFundSnapshot[]> {
    return mockDailySnapshots;
  },

  async getTransactions(): Promise<AdminTransaction[]> {
    return transactionService.getAdminTransactions();
  },

  async getAnnouncements(): Promise<AdminAnnouncement[]> {
    return mockAdminAnnouncements;
  },

  async getTestimonials(): Promise<AdminTestimonial[]> {
    return mockAdminTestimonials;
  },

  async getFaqItems(): Promise<FaqItem[]> {
    return mockFaqItems;
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    try {
      const { auditService } = await import("@/services/audit.service");
      const logs = await auditService.listRecent(200);
      if (logs.length > 0) return logs;
    } catch {
      /* fall back to mock when DB unavailable */
    }
    return mockAuditLogs;
  },

  async getPlatformSettings(): Promise<PlatformSetting[]> {
    return mockPlatformSettings;
  },

  async getInvestorsPaginated(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResponse<AdminInvestor>> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    let filtered = [...mockAdminInvestors];

    if (options?.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.profile.fullName.toLowerCase().includes(q) ||
          i.profile.email.toLowerCase().includes(q)
      );
    }

    const from = (page - 1) * pageSize;
    return {
      data: filtered.slice(from, from + pageSize),
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
    };
  },
};
