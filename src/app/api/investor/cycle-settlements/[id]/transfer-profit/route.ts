import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  return NextResponse.json(
    { error: "Profit transfer is now part of Stop copying." },
    { status: 410 }
  );
}
