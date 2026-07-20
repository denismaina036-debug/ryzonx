import { NextResponse } from "next/server";
import { poolManagerApplicationService } from "@/services/pool-manager-application.service";
import { AdmissionInsufficientBalanceError } from "@/domain/pool-manager/admission-errors";

export async function POST() {
  try {
    const application = await poolManagerApplicationService.submitAdmissionApplication();
    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof AdmissionInsufficientBalanceError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          availableBalance: error.availableBalance,
          requiredAmount: error.requiredAmount,
        },
        { status: 402 }
      );
    }
    const message = error instanceof Error ? error.message : "Submission failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
