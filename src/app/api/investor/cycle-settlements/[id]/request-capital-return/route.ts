import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  return NextResponse.json(
    { error: "Capital return is now part of Stop copying and does not require approval." },
    { status: 410 }
  );
}
