import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { settlementService } from "@/services/settlement.service";
import { distributionService } from "@/services/distribution.service";
import { ledgerService } from "@/services/ledger.service";
import { financialAdjustmentService } from "@/services/financial-adjustment.service";
import { ledgerValidationService } from "@/services/ledger-validation.service";
import type { AdminFinancialOperationsView } from "@/domain/financial/types";

export const financialHealthService = {
  async getAdminOperationsView(): Promise<AdminFinancialOperationsView> {
    await requireRole(USER_ROLES.ADMINISTRATOR);

    const [
      settlementQueue,
      distributionQueue,
      recentTransactions,
      batchHistory,
      outstandingAdjustments,
      integrity,
    ] = await Promise.all([
      settlementService.listPendingBatches(),
      distributionService.listPending(),
      ledgerService.listRecent(30),
      settlementService.listBatchHistory(20),
      financialAdjustmentService.listOutstanding(),
      ledgerValidationService.verifyIntegrity(),
    ]);

    return {
      settlementQueue,
      distributionQueue,
      recentTransactions,
      batchHistory,
      health: {
        ledgerBalanced: integrity.isBalanced,
        outstandingAdjustments: outstandingAdjustments.length,
        pendingSettlements: integrity.settlementPending,
        pendingDistributions: integrity.distributionPending,
      },
    };
  },
};
