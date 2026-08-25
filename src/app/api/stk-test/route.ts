import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().trim().email(),
  amount: z.coerce.number().int().positive().max(1_000_000),
  msisdn: z.string().trim().regex(/^(?:254|0)7\d{8}$/, "Use 07XXXXXXXX or 2547XXXXXXXX"),
  reference: z.string().trim().min(1).max(100),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STK_TEST_PAGE !== "true") {
    return NextResponse.json({ error: "STK test endpoint is disabled." }, { status: 404 });
  }

  const apiKey = process.env.MEGAPAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "MEGAPAY_API_KEY is not configured in .env.local." },
      { status: 503 }
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the submitted fields.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const endpoint = process.env.MEGAPAY_STK_URL ?? "https://megapay.co.ke/backend/v1/initiatestk";

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, ...parsed.data }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    const text = await upstream.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { response: text || "MegaPay returned an empty response." };
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not reach MegaPay." },
      { status: 502 }
    );
  }
}
