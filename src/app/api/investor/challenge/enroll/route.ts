import { NextResponse } from "next/server";
import { challengeService } from "@/services/challenge.service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { paymentMethod?: string };
    if (body.paymentMethod !== "balance" && body.paymentMethod !== "crypto") {
      return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
    }

    const result = await challengeService.enroll({
      paymentMethod: body.paymentMethod,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enrollment failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
