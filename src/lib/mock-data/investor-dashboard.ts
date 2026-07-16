import type {
  InvestorDashboardPageData,
  InvestorDashboardTrade,
  InvestorPoolActivityItem,
  TraderChallenge,
} from "@/features/investor/types";

const MOCK_RUNNING_TRADES: InvestorDashboardTrade[] = [
  {
    id: "t-1",
    asset: "XAU/USD",
    direction: "long",
    entryPrice: 2345.5,
    currentPrice: 2368.2,
    investedAmount: 2500,
    profitLoss: 196.5,
    status: "partials_taken",
    isActive: true,
    chartScreenshotUrl: null,
    openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t-2",
    asset: "EUR/USD",
    direction: "short",
    entryPrice: 1.085,
    currentPrice: 1.082,
    investedAmount: 1800,
    profitLoss: 54.0,
    status: "running",
    isActive: true,
    chartScreenshotUrl: null,
    openedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t-3",
    asset: "BTC/USD",
    direction: "long",
    entryPrice: 61200,
    currentPrice: 62850,
    investedAmount: 3200,
    profitLoss: 412.8,
    status: "running",
    isActive: true,
    chartScreenshotUrl: null,
    openedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_CLOSED_TRADES: InvestorDashboardTrade[] = [
  {
    id: "t-4",
    asset: "GBP/JPY",
    direction: "long",
    entryPrice: 188.45,
    currentPrice: 190.12,
    investedAmount: 1500,
    profitLoss: 245.0,
    status: "take_profit_hit",
    isActive: false,
    chartScreenshotUrl: null,
    openedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t-5",
    asset: "NAS100",
    direction: "short",
    entryPrice: 18250,
    currentPrice: 18120,
    investedAmount: 2200,
    profitLoss: 180.0,
    status: "closed",
    isActive: false,
    chartScreenshotUrl: null,
    openedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t-6",
    asset: "USD/JPY",
    direction: "long",
    entryPrice: 149.2,
    currentPrice: 148.85,
    investedAmount: 1200,
    profitLoss: -42.5,
    status: "stop_loss_hit",
    isActive: false,
    chartScreenshotUrl: null,
    openedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function getMockInvestorTrades(): {
  running: InvestorDashboardTrade[];
  closed: InvestorDashboardTrade[];
} {
  return {
    running: MOCK_RUNNING_TRADES,
    closed: MOCK_CLOSED_TRADES,
  };
}

/** Fallback dashboard dataset when Supabase rows are empty (dev/demo). */
export function getMockInvestorDashboardData(
  overrides?: Partial<InvestorDashboardPageData>
): InvestorDashboardPageData {
  const recentTrades = MOCK_RUNNING_TRADES;

  const recentActivity: InvestorPoolActivityItem[] = [
    {
      id: "a-1",
      investorName: "John M.",
      action: "deposited",
      amount: 500,
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: "a-2",
      investorName: "Sarah K.",
      action: "withdrew",
      amount: 1200,
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
      id: "a-3",
      investorName: "Michael R.",
      action: "deposited",
      amount: 2500,
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: "a-4",
      investorName: "Emma L.",
      action: "deposited",
      amount: 750,
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
      id: "a-5",
      investorName: "James T.",
      action: "deposited",
      amount: 3200,
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    },
    {
      id: "a-6",
      investorName: "Lisa P.",
      action: "withdrew",
      amount: 800,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "a-7",
      investorName: "David W.",
      action: "deposited",
      amount: 1500,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "a-8",
      investorName: "Anna K.",
      action: "deposited",
      amount: 4200,
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const challenge: TraderChallenge = {
    id: "challenge-1",
    title: "RyvonX Manager Journey",
    description:
      "Begin your path to becoming a certified RyvonX Pool Manager and unlock capital allocation eligibility.",
    price: 199,
    profitTargetPct: 10,
    maxDailyLossPct: null,
    maxOverallLossPct: 5,
    durationDays: 30,
    rulesSummary:
      "No daily loss limit, Overall loss limit 5%, Profit target 10%, One-time fee.",
    buttonText: "Continue Manager Journey",
    isActive: true,
  };

  return {
    investment: {
      balance: 12450,
      poolProfit: 2450,
      participations: [
        {
          fundId: "00000000-0000-4000-a000-000000000001",
          poolName: "RyvoFund Main Pool",
          amountInvested: 7000,
          currentValue: 7840,
          poolProfit: 840,
          projectedReturnPct: 12,
          poolWinRate: 68.5,
          investmentStartDate: "2025-04-01",
          termEndDate: "2025-07-01",
          termEnded: true,
          poolDurationDays: 90,
        },
        {
          fundId: "00000000-0000-4000-a000-000000000002",
          poolName: "Gold Momentum Pool",
          amountInvested: 3000,
          currentValue: 3610,
          poolProfit: 610,
          projectedReturnPct: 18,
          poolWinRate: 72.1,
          investmentStartDate: "2025-05-15",
          termEndDate: "2025-08-15",
          termEnded: false,
          poolDurationDays: 90,
        },
      ],
    },
    poolPerformance: {
      totalPoolBalance: 2450000,
      totalProfit: 1245,
      totalProfitPct: 8.91,
      totalContributors: 1248,
      investorRank: 18,
      rankPercentile: 1.44,
      clientSharePct: 1.45,
      poolName: "Elite Gold Strategy",
      managerName: "David Mwangi",
      managerRating: 4.9,
      poolHealth: "healthy",
      myInvestment: 23200,
    },
    recentTrades,
    recentActivity,
    challenge,
    challengeEnrollment: null,
    unreadNotifications: 2,
    ...overrides,
  };
}
