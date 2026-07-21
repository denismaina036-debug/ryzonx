import { createClient } from "@/lib/supabase/server";
import { DEFAULT_FUND_ID, DEFAULT_FUND_NAME } from "@/constants/funds";
import { requireAuth } from "@/lib/auth/session";
import { ensurePlatformFundingFund } from "@/services/platform-funding.service";
import {
  communicationTriggers,
  adminNotifyService,
} from "@/services/communication";
import { formatMoney } from "@/services/communication/user-variables";
import {
  MOCK_CRYPTO_DEPOSIT_ASSETS,
  MOCK_DEPOSIT_FAQ,
} from "@/lib/mock-data/crypto-deposits";
import type {
  CryptoDepositAsset,
  CryptoDepositNetwork,
  CryptoDepositPageData,
  CryptoDepositWallet,
  RecentCryptoDeposit,
  SubmitCryptoDepositInput,
} from "@/features/investor/types/deposit";
import type { Tables } from "@/types/database.types";

type WalletRow = Tables<"crypto_deposit_wallets">;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function groupWallets(rows: WalletRow[]): CryptoDepositAsset[] {
  const map = new Map<string, CryptoDepositAsset>();

  for (const row of rows) {
    const existing = map.get(row.symbol);
    const network: CryptoDepositNetwork = {
      id: row.id,
      networkCode: row.network_code,
      networkLabel: row.network_label,
      walletAddress: row.wallet_address,
      minDeposit: toNumber(row.min_deposit),
    };

    if (existing) {
      existing.networks.push(network);
    } else {
      map.set(row.symbol, {
        symbol: row.symbol,
        name: row.name,
        iconColor: row.icon_color,
        sortOrder: row.sort_order,
        networks: [network],
      });
    }
  }

  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

function flattenWallets(assets: CryptoDepositAsset[]): CryptoDepositWallet[] {
  return assets.flatMap((asset) =>
    asset.networks.map((network) => ({
      id: network.id,
      symbol: asset.symbol,
      name: asset.name,
      iconColor: asset.iconColor,
      networkCode: network.networkCode,
      networkLabel: network.networkLabel,
      walletAddress: network.walletAddress,
      minDeposit: network.minDeposit,
    }))
  );
}

function findMockWallet(
  symbol: string,
  networkCode: string
): { symbol: string; network_code: string; min_deposit: number; is_active: boolean } | null {
  for (const asset of MOCK_CRYPTO_DEPOSIT_ASSETS) {
    if (asset.symbol !== symbol) continue;
    const network = asset.networks.find((n) => n.networkCode === networkCode);
    if (network) {
      return {
        symbol: asset.symbol,
        network_code: network.networkCode,
        min_deposit: network.minDeposit,
        is_active: true,
      };
    }
  }
  return null;
}

function mapRecentDeposit(row: {
  id: string;
  amount: number | string;
  crypto_symbol?: string | null;
  crypto_network?: string | null;
  crypto_amount?: number | string | null;
  status: string;
  created_at: string;
  notes?: string | null;
}): RecentCryptoDeposit {
  let symbol = row.crypto_symbol ?? "—";
  let network = row.crypto_network ?? "—";

  if (symbol === "—" && row.notes?.includes("Crypto deposit")) {
    const match = row.notes.match(/Crypto deposit — (\w+) on (\w+)/);
    if (match) {
      symbol = match[1] ?? symbol;
      network = match[2] ?? network;
    }
  }

  return {
    id: row.id,
    symbol,
    network,
    amount: toNumber(row.amount),
    cryptoAmount:
      row.crypto_amount != null ? toNumber(row.crypto_amount) : toNumber(row.amount),
    status: row.status,
    createdAt: row.created_at,
  };
}

async function resolveActiveWallet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: SubmitCryptoDepositInput
): Promise<{ symbol: string; min_deposit: number }> {
  if (UUID_RE.test(input.walletId)) {
    const { data: wallet } = await supabase
      .from("crypto_deposit_wallets")
      .select("id, symbol, network_code, min_deposit, is_active")
      .eq("id", input.walletId)
      .eq("is_active", true)
      .maybeSingle();

    const walletRow = wallet as WalletRow | null;
    if (walletRow?.is_active) {
      return { symbol: walletRow.symbol, min_deposit: toNumber(walletRow.min_deposit) };
    }
  }

  const { data: byNetwork } = await supabase
    .from("crypto_deposit_wallets")
    .select("id, symbol, network_code, min_deposit, is_active")
    .eq("symbol", input.symbol)
    .eq("network_code", input.networkCode)
    .eq("is_active", true)
    .maybeSingle();

  const networkRow = byNetwork as WalletRow | null;
  if (networkRow?.is_active) {
    return { symbol: networkRow.symbol, min_deposit: toNumber(networkRow.min_deposit) };
  }

  const mock = findMockWallet(input.symbol, input.networkCode);
  if (mock) {
    return { symbol: mock.symbol, min_deposit: mock.min_deposit };
  }

  throw new Error("Invalid or inactive deposit wallet.");
}

async function fetchRecentDeposits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const withCrypto = await supabase
    .from("transactions")
    .select(
      "id, amount, crypto_symbol, crypto_network, crypto_amount, status, created_at, notes"
    )
    .eq("user_id", userId)
    .eq("type", "deposit")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!withCrypto.error && withCrypto.data) {
    return withCrypto.data;
  }

  const basic = await supabase
    .from("transactions")
    .select("id, amount, status, created_at, notes, payment_method")
    .eq("user_id", userId)
    .eq("type", "deposit")
    .order("created_at", { ascending: false })
    .limit(5);

  return basic.data ?? [];
}

export const depositService = {
  async getCryptoDepositPageData(): Promise<CryptoDepositPageData> {
    const user = await requireAuth();
    const supabase = await createClient();

    const [walletsResult, recentRows, fundResult] = await Promise.all([
      supabase
        .from("crypto_deposit_wallets")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      fetchRecentDeposits(supabase, user.id),
      supabase
        .from("funds")
        .select("name, min_investment")
        .eq("id", DEFAULT_FUND_ID)
        .maybeSingle(),
    ]);

    const walletRows = (walletsResult.data ?? []) as WalletRow[];
    const assets =
      walletRows.length > 0 ? groupWallets(walletRows) : MOCK_CRYPTO_DEPOSIT_ASSETS;
    const wallets = flattenWallets(assets);

    const recentDeposits =
      recentRows.length > 0
        ? recentRows.map((row) => mapRecentDeposit(row as Parameters<typeof mapRecentDeposit>[0]))
        : [];

    const fund = fundResult.data as {
      name?: string;
      min_investment?: number;
    } | null;

    return {
      assets,
      wallets,
      recentDeposits,
      faqItems: MOCK_DEPOSIT_FAQ,
      minInvestment: toNumber(fund?.min_investment) || 100,
      fundName: fund?.name ?? DEFAULT_FUND_NAME,
    };
  },

  async submitCryptoDeposit(
    input: SubmitCryptoDepositInput
  ): Promise<{ id: string }> {
    const user = await requireAuth();
    await ensurePlatformFundingFund();
    const supabase = await createClient();
    const wallet = await resolveActiveWallet(supabase, input);

    if (input.amount < wallet.min_deposit) {
      throw new Error(
        `Minimum deposit is ${wallet.min_deposit} ${wallet.symbol}.`
      );
    }

    const notes = `Crypto deposit — ${input.symbol} on ${input.networkCode}`;
    const basePayload = {
      user_id: user.id,
      fund_id: DEFAULT_FUND_ID,
      type: "deposit" as const,
      amount: input.amount,
      status: "pending" as const,
      payment_method: "crypto",
      reference: input.txHash?.trim() || null,
      notes,
    };

    const withCrypto = (await supabase
      .from("transactions")
      .insert({
        ...basePayload,
        crypto_symbol: input.symbol,
        crypto_network: input.networkCode,
        crypto_amount: input.amount,
      } as never)
      .select("id")
      .single()) as { data: { id: string } | null; error: { message: string } | null };

    if (!withCrypto.error && withCrypto.data) {
      const id = withCrypto.data.id;
      await communicationTriggers.depositSubmitted({
        userId: user.id,
        amount: formatMoney(input.amount),
        transactionId: id,
      });
      await adminNotifyService.newDeposit({
        amount: formatMoney(input.amount),
        userName: user.email ?? user.id,
        transactionId: id,
        triggeredBy: user.id,
      });
      return { id };
    }

    const missingCryptoColumn =
      withCrypto.error?.message?.includes("crypto_") ||
      withCrypto.error?.message?.includes("schema cache");

    if (!missingCryptoColumn) {
      throw new Error(withCrypto.error?.message ?? "Failed to submit deposit.");
    }

    const fallback = (await supabase
      .from("transactions")
      .insert(basePayload as never)
      .select("id")
      .single()) as { data: { id: string } | null; error: { message: string } | null };

    if (fallback.error || !fallback.data) {
      throw new Error(
        fallback.error?.message ??
          "Database schema is out of date. Run: npm run db:migrate"
      );
    }

    const id = fallback.data.id;
    await communicationTriggers.depositSubmitted({
      userId: user.id,
      amount: formatMoney(input.amount),
      transactionId: id,
    });
    await adminNotifyService.newDeposit({
      amount: formatMoney(input.amount),
      userName: user.email ?? user.id,
      transactionId: id,
      triggeredBy: user.id,
    });
    return { id };
  },

  async getAdminCryptoWallets(): Promise<WalletRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("crypto_deposit_wallets")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as WalletRow[];
    }

    return MOCK_CRYPTO_DEPOSIT_ASSETS.flatMap((asset) =>
      asset.networks.map((n, i) => ({
        id: n.id,
        fund_id: DEFAULT_FUND_ID,
        symbol: asset.symbol,
        name: asset.name,
        network_code: n.networkCode,
        network_label: n.networkLabel,
        wallet_address: n.walletAddress,
        min_deposit: n.minDeposit,
        icon_color: asset.iconColor,
        sort_order: asset.sortOrder * 10 + i,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
    ) as WalletRow[];
  },

  async createAdminCryptoWallet(input: {
    symbol: string;
    name: string;
    networkCode: string;
    networkLabel: string;
    walletAddress: string;
    minDeposit: number;
    iconColor?: string;
  }): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.from("crypto_deposit_wallets").insert({
      fund_id: DEFAULT_FUND_ID,
      symbol: input.symbol.toUpperCase(),
      name: input.name,
      network_code: input.networkCode.toUpperCase(),
      network_label: input.networkLabel,
      wallet_address: input.walletAddress.trim(),
      min_deposit: input.minDeposit,
      icon_color: input.iconColor ?? "#627d98",
      sort_order: 99,
      is_active: true,
    } as never);

    if (error) {
      if (error.message.includes("crypto_deposit_wallets")) {
        throw new Error(
          "Crypto wallets table missing. Run: npm run db:migrate"
        );
      }
      throw new Error(error.message);
    }
  },
};
