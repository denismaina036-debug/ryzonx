export interface WalletPoolParticipation {
  fundId: string;
  poolName: string;
  amountInvested: number;
  currentValue: number;
  poolProfit: number;
  projectedReturnPct: number | null;
  poolWinRate: number;
  investmentStartDate: string | null;
  termEndDate: string | null;
  termEnded: boolean;
  poolDurationDays: number | null;
}

export interface InvestorInvestmentSummary {
  /** Cash in the Funding Wallet — deposits, transferred pool profit, withdrawals */
  balance: number;
  /** Profit still held in pool participations (transfer or reinvest from pool cards) */
  poolProfit: number;
  participations: WalletPoolParticipation[];
}

export interface InvestorTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  reference: string | null;
  cryptoSymbol: string | null;
  cryptoNetwork: string | null;
  cryptoAmount: number | null;
  fundName: string;
  poolWinRate: number | null;
  createdAt: string;
  processedAt: string | null;
}
