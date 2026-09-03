export interface CryptoDepositWallet {
  id: string;
  symbol: string;
  name: string;
  iconColor: string;
  networkCode: string;
  networkLabel: string;
  walletAddress: string;
  minDeposit: number;
}

export interface CryptoDepositNetwork {
  id: string;
  networkCode: string;
  networkLabel: string;
  walletAddress: string;
  minDeposit: number;
}

export interface CryptoDepositAsset {
  symbol: string;
  name: string;
  iconColor: string;
  sortOrder: number;
  networks: CryptoDepositNetwork[];
}

export interface DepositFaqItem {
  id: string;
  question: string;
  href?: string;
}

export interface RecentCryptoDeposit {
  id: string;
  symbol: string;
  network: string;
  amount: number;
  cryptoAmount: number | null;
  status: string;
  createdAt: string;
  paymentMethod: string;
  kesAmount: number | null;
}

export interface CryptoDepositPageData {
  assets: CryptoDepositAsset[];
  wallets: CryptoDepositWallet[];
  recentDeposits: RecentCryptoDeposit[];
  faqItems: DepositFaqItem[];
  minInvestment: number;
  cryptoMinimumDepositUsd: number;
  fundName: string;
  fundingWalletBalance: number;
  mobilePayment: MobilePaymentConfig;
}

export interface SubmitCryptoDepositInput {
  walletId: string;
  symbol: string;
  networkCode: string;
  /** Deposit amount in USD (credited to wallet on approval). */
  amount: number;
  txHash?: string;
}
import type { MobilePaymentConfig } from "@/features/investor/types/mobile-payment";
