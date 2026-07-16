import { NextResponse } from "next/server";

import { depositService } from "@/services/deposit.service";

import { createClient } from "@/lib/supabase/server";

import { requireAuth } from "@/lib/auth/session";



export async function POST(request: Request) {

  try {

    const user = await requireAuth();

    if (user.role !== "administrator") {

      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    }



    const body = (await request.json()) as {

      symbol: string;

      name: string;

      networkCode: string;

      networkLabel: string;

      walletAddress: string;

      minDeposit: number;

      iconColor?: string;

    };



    if (

      !body.symbol ||

      !body.name ||

      !body.networkCode ||

      !body.networkLabel ||

      !body.walletAddress ||

      body.minDeposit == null

    ) {

      return NextResponse.json(

        { error: "All wallet fields are required." },

        { status: 400 }

      );

    }



    await depositService.createAdminCryptoWallet(body);

    return NextResponse.json({ ok: true });

  } catch (err) {

    const message = err instanceof Error ? err.message : "Create failed.";

    return NextResponse.json({ error: message }, { status: 400 });

  }

}



export async function PATCH(request: Request) {

  try {

    const user = await requireAuth();

    if (user.role !== "administrator") {

      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    }



    const body = (await request.json()) as {

      id: string;

      walletAddress?: string;

      minDeposit?: number;

      isActive?: boolean;

    };



    if (!body.id) {

      return NextResponse.json({ error: "Wallet id required." }, { status: 400 });

    }



    const supabase = await createClient();

    const updates: Record<string, unknown> = {};

    if (body.walletAddress != null) updates.wallet_address = body.walletAddress;

    if (body.minDeposit != null) updates.min_deposit = body.minDeposit;

    if (body.isActive != null) updates.is_active = body.isActive;



    const { error } = await supabase

      .from("crypto_deposit_wallets")

      .update(updates as never)

      .eq("id", body.id);



    if (error) {

      return NextResponse.json({ error: error.message }, { status: 400 });

    }



    return NextResponse.json({ ok: true });

  } catch (err) {

    const message = err instanceof Error ? err.message : "Update failed.";

    return NextResponse.json({ error: message }, { status: 400 });

  }

}

