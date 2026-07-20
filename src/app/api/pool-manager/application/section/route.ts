import { NextResponse } from "next/server";
import { poolManagerApplicationService } from "@/services/pool-manager-application.service";
import {
  PM_APPLICATION_SECTIONS,
  type PoolManagerApplicationData,
  type PoolManagerApplicationSection,
} from "@/domain/pool-manager/types";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      section?: PoolManagerApplicationSection;
      data?: Partial<PoolManagerApplicationData>;
    };

    if (!body.section || !body.data) {
      return NextResponse.json({ error: "section and data are required" }, { status: 400 });
    }

    const validSections = Object.values(PM_APPLICATION_SECTIONS);
    if (!validSections.includes(body.section)) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }

    const application = await poolManagerApplicationService.saveApplicationSection({
      section: body.section,
      data: body.data,
    });

    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
