import { NextResponse } from "next/server";
import { poolManagerAdminService, poolManagerApplicationService } from "@/services/pool-manager-application.service";
import type { PoolManagerApplicationStatus } from "@/domain/pool-manager/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const application = await poolManagerAdminService.getApplicationById(id);
    const reviews = await poolManagerApplicationService.getApplicationReviews(id);
    return NextResponse.json({ application, reviews });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      status?: PoolManagerApplicationStatus;
      notes?: string;
      challengeAccountInfo?: string;
      broker?: string;
      server?: string;
      login?: string;
      initialBalance?: number;
      initialRating?: {
        ryvonxRating?: number;
        experienceLevel?: string;
        riskClassification?: string;
        isVerified?: boolean;
        featured?: boolean;
      };
    };

    if (
      body.challengeAccountInfo !== undefined ||
      body.broker !== undefined ||
      body.server !== undefined ||
      body.login !== undefined ||
      body.initialBalance !== undefined
    ) {
      const application = await poolManagerAdminService.updateChallengeAccountInfo({
        applicationId: id,
        challengeAccountInfo: body.challengeAccountInfo,
        broker: body.broker,
        server: body.server,
        login: body.login,
        initialBalance: body.initialBalance,
      });
      return NextResponse.json({ application });
    }

    if (!body.status) {
      return NextResponse.json({ error: "status or challengeAccountInfo is required" }, { status: 400 });
    }

    const application = await poolManagerAdminService.updateApplicationStatus({
      applicationId: id,
      newStatus: body.status,
      notes: body.notes,
      initialRating: body.initialRating,
    });

    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
