export interface ReferralSummary {
  referralCode: string;
  referralLink: string;
  rewardAmount: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalReferralRewards: number;
}

export interface ReferralRewardResult {
  referralId: string;
  referrerId: string;
  rewardAmount: number;
  rewardTransactionId: string | null;
  rewardedNow: boolean;
}

