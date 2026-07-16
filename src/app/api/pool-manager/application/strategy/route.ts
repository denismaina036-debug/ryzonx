import { NextResponse } from "next/server";
import { poolManagerApplicationService } from "@/services/pool-manager-application.service";
import type { PoolManagerStrategyData } from "@/domain/pool-manager/types";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      strategyData?: PoolManagerStrategyData;
      submit?: boolean;
    };

    if (body.submit) {
      const application = await poolManagerApplicationService.submitStrategy();
      return NextResponse.json({ application });
    }

    if (!body.strategyData) {
      return NextResponse.json({ error: "strategyData is required" }, { status: 400 });
    }

    const application = await poolManagerApplicationService.saveStrategyDraft(
      body.strategyData
    );
    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
