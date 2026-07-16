import { DEFAULT_FUND_ID, DEFAULT_FUND_NAME, DEFAULT_FUND_SLUG } from "@/constants/funds";
import type {
  Fund,
  FundStats,
  PerformanceSnapshot,
  Trade,
  ActivityItem,
  InvestorStats,
  FaqItem,
  Testimonial,
} from "@/types";

// =============================================================================
// Default Fund
// =============================================================================

export const mockFund: Fund = {
  id: DEFAULT_FUND_ID,
  name: DEFAULT_FUND_NAME,
  slug: DEFAULT_FUND_SLUG,
  description:
    "Our flagship professionally managed trading pool. Transparent performance, verified trades, and proportional investor ownership.",
  status: "active",
  isDefault: true,
  createdAt: "2025-01-01T00:00:00Z",
};

// =============================================================================
// Fund Statistics
// =============================================================================

export const mockFundStats: FundStats = {
  fundId: DEFAULT_FUND_ID,
  totalPoolValue: 2847500,
  totalActiveInvestors: 127,
  dailyRoi: 0.42,
  weeklyRoi: 2.18,
  monthlyRoi: 8.74,
  yearlyRoi: 47.32,
  totalClosedTrades: 342,
  winRate: 68.4,
  totalDeposits: 3125000,
  totalWithdrawals: 277500,
  averageInvestment: 24606,
  largestInvestment: 250000,
  averageRoi: 12.8,
  updatedAt: new Date().toISOString(),
};

// =============================================================================
// Performance History (12 months daily samples)
// =============================================================================

function generatePerformanceHistory(): PerformanceSnapshot[] {
  const data: PerformanceSnapshot[] = [];
  let poolValue = 1800000;
  const now = new Date();

  for (let i = 365; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dailyChange = (Math.random() - 0.42) * 0.015;
    poolValue *= 1 + dailyChange;
    const dailyRoi = dailyChange * 100;
    const cumulativeRoi = ((poolValue - 1800000) / 1800000) * 100;

    data.push({
      id: `perf-${i}`,
      fundId: DEFAULT_FUND_ID,
      date: date.toISOString().split("T")[0] ?? "",
      poolValue: Math.round(poolValue),
      dailyRoi: parseFloat(dailyRoi.toFixed(4)),
      cumulativeRoi: parseFloat(cumulativeRoi.toFixed(4)),
      createdAt: date.toISOString(),
    });
  }
  return data;
}

export const mockPerformanceHistory = generatePerformanceHistory();

// =============================================================================
// Trades
// =============================================================================

export const mockTrades: Trade[] = [
  {
    id: "t1", fundId: DEFAULT_FUND_ID, symbol: "EUR/USD", direction: "long",
    entryPrice: 1.0842, exitPrice: 1.0918, quantity: 500000,
    pnl: 3800, pnlPercentage: 0.7, status: "closed",
    openedAt: "2026-07-10T08:30:00Z", closedAt: "2026-07-10T16:45:00Z",
    notes: null, publishedAt: "2026-07-10T17:00:00Z", createdAt: "2026-07-10T08:30:00Z",
  },
  {
    id: "t2", fundId: DEFAULT_FUND_ID, symbol: "XAU/USD", direction: "long",
    entryPrice: 2345.5, exitPrice: 2368.2, quantity: 100,
    pnl: 2270, pnlPercentage: 0.97, status: "closed",
    openedAt: "2026-07-09T10:00:00Z", closedAt: "2026-07-09T22:15:00Z",
    notes: null, publishedAt: "2026-07-09T22:30:00Z", createdAt: "2026-07-09T10:00:00Z",
  },
  {
    id: "t3", fundId: DEFAULT_FUND_ID, symbol: "GBP/JPY", direction: "short",
    entryPrice: 198.45, exitPrice: 197.12, quantity: 250000,
    pnl: 1662.5, pnlPercentage: 0.67, status: "closed",
    openedAt: "2026-07-08T07:15:00Z", closedAt: "2026-07-08T14:30:00Z",
    notes: null, publishedAt: "2026-07-08T15:00:00Z", createdAt: "2026-07-08T07:15:00Z",
  },
  {
    id: "t4", fundId: DEFAULT_FUND_ID, symbol: "BTC/USD", direction: "long",
    entryPrice: 67200, exitPrice: 69850, quantity: 2,
    pnl: 5300, pnlPercentage: 3.94, status: "closed",
    openedAt: "2026-07-07T12:00:00Z", closedAt: "2026-07-08T06:00:00Z",
    notes: null, publishedAt: "2026-07-08T06:30:00Z", createdAt: "2026-07-07T12:00:00Z",
  },
  {
    id: "t5", fundId: DEFAULT_FUND_ID, symbol: "USD/JPY", direction: "long",
    entryPrice: 157.82, exitPrice: 158.45, quantity: 400000,
    pnl: 1596, pnlPercentage: 0.4, status: "closed",
    openedAt: "2026-07-06T09:00:00Z", closedAt: "2026-07-06T17:00:00Z",
    notes: null, publishedAt: "2026-07-06T17:30:00Z", createdAt: "2026-07-06T09:00:00Z",
  },
  {
    id: "t6", fundId: DEFAULT_FUND_ID, symbol: "AAPL", direction: "long",
    entryPrice: 198.5, exitPrice: 195.2, quantity: 1000,
    pnl: -3300, pnlPercentage: -1.66, status: "closed",
    openedAt: "2026-07-05T14:30:00Z", closedAt: "2026-07-06T09:30:00Z",
    notes: null, publishedAt: "2026-07-06T10:00:00Z", createdAt: "2026-07-05T14:30:00Z",
  },
  {
    id: "t7", fundId: DEFAULT_FUND_ID, symbol: "NAS100", direction: "long",
    entryPrice: 20150, exitPrice: 20380, quantity: 10,
    pnl: 2300, pnlPercentage: 1.14, status: "closed",
    openedAt: "2026-07-04T08:00:00Z", closedAt: "2026-07-04T20:00:00Z",
    notes: null, publishedAt: "2026-07-04T20:30:00Z", createdAt: "2026-07-04T08:00:00Z",
  },
  {
    id: "t8", fundId: DEFAULT_FUND_ID, symbol: "EUR/GBP", direction: "short",
    entryPrice: 0.8425, exitPrice: 0.8398, quantity: 300000,
    pnl: 810, pnlPercentage: 0.32, status: "closed",
    openedAt: "2026-07-03T11:00:00Z", closedAt: "2026-07-03T18:00:00Z",
    notes: null, publishedAt: "2026-07-03T18:30:00Z", createdAt: "2026-07-03T11:00:00Z",
  },
  {
    id: "t9", fundId: DEFAULT_FUND_ID, symbol: "XAU/USD", direction: "long",
    entryPrice: 2310.0, exitPrice: null, quantity: 50,
    pnl: null, pnlPercentage: null, status: "open",
    openedAt: "2026-07-12T09:00:00Z", closedAt: null,
    notes: null, publishedAt: "2026-07-12T09:30:00Z", createdAt: "2026-07-12T09:00:00Z",
  },
  {
    id: "t10", fundId: DEFAULT_FUND_ID, symbol: "ETH/USD", direction: "long",
    entryPrice: 3450, exitPrice: 3620, quantity: 50,
    pnl: 8500, pnlPercentage: 4.93, status: "closed",
    openedAt: "2026-07-02T10:00:00Z", closedAt: "2026-07-03T08:00:00Z",
    notes: null, publishedAt: "2026-07-03T08:30:00Z", createdAt: "2026-07-02T10:00:00Z",
  },
];

// =============================================================================
// Activity Feeds
// =============================================================================

export const mockRecentDeposits: ActivityItem[] = [
  { id: "d1", fundId: DEFAULT_FUND_ID, displayName: "Michael R.", amount: 25000, type: "deposit", createdAt: "2026-07-14T10:30:00Z", isPublic: true },
  { id: "d2", fundId: DEFAULT_FUND_ID, displayName: "Sarah K.", amount: 10000, type: "deposit", createdAt: "2026-07-14T08:15:00Z", isPublic: true },
  { id: "d3", fundId: DEFAULT_FUND_ID, displayName: "James T.", amount: 50000, type: "deposit", createdAt: "2026-07-13T16:45:00Z", isPublic: true },
  { id: "d4", fundId: DEFAULT_FUND_ID, displayName: "Emma L.", amount: 5000, type: "deposit", createdAt: "2026-07-13T11:20:00Z", isPublic: true },
  { id: "d5", fundId: DEFAULT_FUND_ID, displayName: "David M.", amount: 15000, type: "deposit", createdAt: "2026-07-12T14:00:00Z", isPublic: true },
  { id: "d6", fundId: DEFAULT_FUND_ID, displayName: "Lisa W.", amount: 7500, type: "deposit", createdAt: "2026-07-12T09:30:00Z", isPublic: false },
];

export const mockRecentWithdrawals: ActivityItem[] = [
  { id: "w1", fundId: DEFAULT_FUND_ID, displayName: "Robert H.", amount: 8000, type: "withdrawal", createdAt: "2026-07-14T09:00:00Z", isPublic: true },
  { id: "w2", fundId: DEFAULT_FUND_ID, displayName: "Anna P.", amount: 12000, type: "withdrawal", createdAt: "2026-07-13T15:30:00Z", isPublic: true },
  { id: "w3", fundId: DEFAULT_FUND_ID, displayName: "Chris B.", amount: 3500, type: "withdrawal", createdAt: "2026-07-12T17:00:00Z", isPublic: true },
  { id: "w4", fundId: DEFAULT_FUND_ID, displayName: "Nina S.", amount: 20000, type: "withdrawal", createdAt: "2026-07-11T10:45:00Z", isPublic: true },
  { id: "w5", fundId: DEFAULT_FUND_ID, displayName: "Mark D.", amount: 6000, type: "withdrawal", createdAt: "2026-07-10T13:20:00Z", isPublic: true },
];

export const mockRecentInvestors: ActivityItem[] = [
  { id: "i1", fundId: DEFAULT_FUND_ID, displayName: "Michael R.", amount: 25000, type: "investor", createdAt: "2026-07-14T10:30:00Z", isPublic: true },
  { id: "i2", fundId: DEFAULT_FUND_ID, displayName: "Sarah K.", amount: 10000, type: "investor", createdAt: "2026-07-14T08:15:00Z", isPublic: true },
  { id: "i3", fundId: DEFAULT_FUND_ID, displayName: "Thomas A.", amount: 30000, type: "investor", createdAt: "2026-07-13T12:00:00Z", isPublic: true },
  { id: "i4", fundId: DEFAULT_FUND_ID, displayName: "Rachel G.", amount: 7500, type: "investor", createdAt: "2026-07-12T16:30:00Z", isPublic: true },
];

// =============================================================================
// Investor Stats
// =============================================================================

export const mockInvestorStats: InvestorStats = {
  fundId: DEFAULT_FUND_ID,
  totalActiveInvestors: 127,
  totalCapitalInvested: 3125000,
  averageInvestment: 24606,
  largestInvestment: 250000,
  averageRoi: 12.8,
  totalDeposits: 3125000,
  totalWithdrawals: 277500,
};

// =============================================================================
// FAQ
// =============================================================================

export const mockFaqItems: FaqItem[] = [
  { id: "f1", question: "What is Ryvonx?", answer: "Ryvonx is a transparent pool trading fund management platform. Investors deposit capital into a professionally managed trading pool and receive proportional ownership based on their contribution.", sortOrder: 1, isPublished: true, createdAt: "2025-01-01T00:00:00Z" },
  { id: "f2", question: "Is Ryvonx a broker or exchange?", answer: "No. Ryvonx is neither a broker, copy trading platform, nor exchange. It is a fund management platform where a professional team manages a pooled investment on behalf of all participants.", sortOrder: 2, isPublished: true, createdAt: "2025-01-01T00:00:00Z" },
  { id: "f3", question: "How do I invest?", answer: "Create an account, deposit your desired investment amount, and once approved you automatically join the pool. Your ownership percentage is calculated based on your proportional contribution to the total pool value.", sortOrder: 3, isPublished: true, createdAt: "2025-01-01T00:00:00Z" },
  { id: "f4", question: "What is the minimum investment?", answer: "The minimum deposit is $100. We recommend starting with an amount you are comfortable with, as all investments carry risk.", sortOrder: 4, isPublished: true, createdAt: "2025-01-01T00:00:00Z" },
  { id: "f5", question: "How are profits distributed?", answer: "Profits and losses are reflected in the pool value. As the pool grows, your proportional ownership value increases accordingly. You can request withdrawals at any time.", sortOrder: 5, isPublished: true, createdAt: "2025-01-01T00:00:00Z" },
  { id: "f6", question: "Can I see all trades?", answer: "Absolutely. Transparency is our core value. Every closed trade is published in our Trading Journal with full details including asset, direction, entry/exit prices, and ROI.", sortOrder: 6, isPublished: true, createdAt: "2025-01-01T00:00:00Z" },
  { id: "f7", question: "How long do withdrawals take?", answer: "Withdrawal requests are reviewed and processed within 1-3 business days. Funds are transferred to your designated account once approved.", sortOrder: 7, isPublished: true, createdAt: "2025-01-01T00:00:00Z" },
  { id: "f8", question: "Is my investment secure?", answer: "We implement bank-grade security including encrypted data, Row Level Security on all database records, and manual verification of all deposits and withdrawals.", sortOrder: 8, isPublished: true, createdAt: "2025-01-01T00:00:00Z" },
];

// =============================================================================
// Testimonials
// =============================================================================

export const mockTestimonials: Testimonial[] = [
  { id: "tm1", name: "Alexander M.", role: "Private Investor", content: "The transparency sold me. I can verify every trade before committing more capital. This is how fund management should work.", rating: 5, returnRate: 18.4 },
  { id: "tm2", name: "Priya S.", role: "Portfolio Manager", content: "Ryvonx's professional approach and clear reporting give me confidence. The performance history speaks for itself.", rating: 5, returnRate: 24.1 },
  { id: "tm3", name: "Daniel K.", role: "Entrepreneur", content: "I joined six months ago and the experience has been seamless. Deposits, tracking, and the journal — everything is intuitive.", rating: 5, returnRate: 12.7 },
  { id: "tm4", name: "Olivia R.", role: "Financial Analyst", content: "Finally a platform that doesn't hide behind complexity. Clean dashboard, real numbers, verified trades.", rating: 4, returnRate: 9.3 },
];

// =============================================================================
// Performance Summary
// =============================================================================

export const mockPerformanceSummary = {
  fundId: DEFAULT_FUND_ID,
  dailyRoi: 0.42,
  weeklyRoi: 2.18,
  monthlyRoi: 8.74,
  yearlyRoi: 47.32,
  winRate: 68.4,
  averageTradeRoi: 1.24,
  bestMonth: { month: "March 2026", roi: 12.4 },
  worstMonth: { month: "January 2026", roi: -2.1 },
  totalTrades: 342,
  profitableTrades: 234,
};
