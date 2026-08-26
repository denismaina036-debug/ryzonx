import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { pmAdmissionTierService } from "@/services/pm-admission-tier.service";
import type { PmAdmissionTierUpdate } from "@/domain/pool-manager/admission-tier";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const input = (await request.json()) as PmAdmissionTierUpdate;
    const tier = await pmAdmissionTierService.update(id, input, user.id);
    return NextResponse.json({ tier });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update admission tier." },
      { status: 400 }
    );
  }
}
