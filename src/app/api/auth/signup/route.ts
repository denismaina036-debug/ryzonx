import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureInvestorBootstrap } from "@/lib/auth/ensure-investor-bootstrap";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { formatFullName, normalizePhone } from "@/lib/auth/register";
import { ROUTES } from "@/constants/routes";

export async function POST(request: Request) {
  let body: {
    email?: string;
    password?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    phone?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const phone = body.phone?.trim();

  if (!email || !password || !firstName || !lastName || !phone) {
    return NextResponse.json(
      { error: "All required fields must be provided" },
      { status: 400 }
    );
  }

  const fullName = formatFullName({
    firstName,
    middleName: body.middleName,
    lastName,
  });

  const metadata: Record<string, string> = {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    phone: normalizePhone(phone),
  };

  const middleName = body.middleName?.trim();
  if (middleName) {
    metadata.middle_name = middleName;
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: getAuthErrorMessage(error) },
      { status: 400 }
    );
  }

  if (data.user?.identities?.length === 0) {
    return NextResponse.json(
      {
        error:
          "An account with this email already exists. Try signing in instead.",
      },
      { status: 409 }
    );
  }

  if (data.session && data.user) {
    try {
      await ensureInvestorBootstrap(data.user);
    } catch {
      // Best-effort bootstrap
    }

    return NextResponse.json({
      redirectTo: ROUTES.dashboard,
      needsVerification: false,
    });
  }

  return NextResponse.json({
    redirectTo: ROUTES.verifyEmail,
    needsVerification: true,
  });
}
