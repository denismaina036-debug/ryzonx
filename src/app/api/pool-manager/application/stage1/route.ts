import { NextResponse } from "next/server";
import { poolManagerApplicationService } from "@/services/pool-manager-application.service";
import type { PoolManagerBasicInfo } from "@/domain/pool-manager/types";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      basicInfo?: PoolManagerBasicInfo;
      complete?: boolean;
    };

    if (body.complete) {
      const application = await poolManagerApplicationService.completeStage1();
      return NextResponse.json({ application });
    }

    if (!body.basicInfo) {
      return NextResponse.json({ error: "basicInfo is required" }, { status: 400 });
    }

    const application = await poolManagerApplicationService.saveBasicInfo(body.basicInfo);
    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
