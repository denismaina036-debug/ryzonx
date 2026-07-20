import { NextResponse } from "next/server";
import { referenceDataService } from "@/services/reference-data.service";
import { REFERENCE_SET_KEYS, type ReferenceSetKey } from "@/domain/reference-data/set-keys";

const VALID_SETS = new Set<string>(Object.values(REFERENCE_SET_KEYS));

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ setKey: string }> }
) {
  try {
    const { setKey } = await params;
    if (!VALID_SETS.has(setKey)) {
      return NextResponse.json({ error: "Unknown reference set" }, { status: 404 });
    }

    const items = await referenceDataService.getSetItems(setKey as ReferenceSetKey);
    return NextResponse.json({ setKey, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load reference data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
