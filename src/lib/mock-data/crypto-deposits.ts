import type {
  CryptoDepositAsset,
  DepositFaqItem,
  RecentCryptoDeposit,
} from "@/features/investor/types/deposit";

export const MOCK_CRYPTO_DEPOSIT_ASSETS: CryptoDepositAsset[] = [
  {
    symbol: "USDT",
    name: "Tether",
    iconColor: "#10b981",
    sortOrder: 1,
    networks: [
      {
        id: "w-usdt-trc20",
        networkCode: "TRC20",
        networkLabel: "Tron (TRC20)",
        walletAddress: "TExampleRyvonXUSDTTRC20DepositWallet",
        minDeposit: 20,
      },
      {
        id: "w-usdt-erc20",
        networkCode: "ERC20",
        networkLabel: "Ethereum (ERC20)",
        walletAddress: "0xExampleRyvonXUSDTERC20DepositWallet",
        minDeposit: 20,
      },
      {
        id: "w-usdt-bep20",
        networkCode: "BEP20",
        networkLabel: "BNB Smart Chain (BEP20)",
        walletAddress: "0xExampleRyvonXUSDTBEP20DepositWallet",
        minDeposit: 20,
      },
    ],
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    iconColor: "#3b82f6",
    sortOrder: 2,
    networks: [
      {
        id: "w-usdc-erc20",
        networkCode: "ERC20",
        networkLabel: "Ethereum (ERC20)",
        walletAddress: "0xExampleRyvonXUSDCERC20DepositWallet",
        minDeposit: 20,
      },
    ],
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    iconColor: "#f59e0b",
    sortOrder: 3,
    networks: [
      {
        id: "w-btc",
        networkCode: "BTC",
        networkLabel: "Bitcoin Network",
        walletAddress: "bc1qexampleRyvonXBTCDepositWallet",
        minDeposit: 0.0001,
      },
    ],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    iconColor: "#60a5fa",
    sortOrder: 4,
    networks: [
      {
        id: "w-eth",
        networkCode: "ERC20",
        networkLabel: "Ethereum (ERC20)",
        walletAddress: "0xExampleRyvonXETHDepositWallet",
        minDeposit: 0.01,
      },
    ],
  },
  {
    symbol: "BNB",
    name: "BNB",
    iconColor: "#fbbf24",
    sortOrder: 5,
    networks: [
      {
        id: "w-bnb",
        networkCode: "BEP20",
        networkLabel: "BNB Smart Chain (BEP20)",
        walletAddress: "0xExampleRyvonXBNBDepositWallet",
        minDeposit: 0.05,
      },
    ],
  },
  {
    symbol: "SOL",
    name: "Solana",
    iconColor: "#a78bfa",
    sortOrder: 6,
    networks: [
      {
        id: "w-sol",
        networkCode: "SOL",
        networkLabel: "Solana Network",
        walletAddress: "ExampleRyvonXSOLDDepositWalletAddress",
        minDeposit: 0.5,
      },
    ],
  },
  {
    symbol: "XRP",
    name: "Ripple",
    iconColor: "#64748b",
    sortOrder: 7,
    networks: [
      {
        id: "w-xrp",
        networkCode: "XRP",
        networkLabel: "XRP Ledger",
        walletAddress: "rExampleRyvonXXRPDepositWallet",
        minDeposit: 10,
      },
    ],
  },
  {
    symbol: "ADA",
    name: "Cardano",
    iconColor: "#3b82f6",
    sortOrder: 8,
    networks: [
      {
        id: "w-ada",
        networkCode: "ADA",
        networkLabel: "Cardano Network",
        walletAddress: "addr1exampleRyvonXADADepositWallet",
        minDeposit: 50,
      },
    ],
  },
  {
    symbol: "DOGE",
    name: "Dogecoin",
    iconColor: "#f59e0b",
    sortOrder: 9,
    networks: [
      {
        id: "w-doge",
        networkCode: "DOGE",
        networkLabel: "Dogecoin Network",
        walletAddress: "DExampleRyvonXDOGEDepositWallet",
        minDeposit: 50,
      },
    ],
  },
  {
    symbol: "TRX",
    name: "Tron",
    iconColor: "#ef4444",
    sortOrder: 10,
    networks: [
      {
        id: "w-trx",
        networkCode: "TRC20",
        networkLabel: "Tron (TRC20)",
        walletAddress: "TExampleRyvonXTRXDepositWallet",
        minDeposit: 50,
      },
    ],
  },
  {
    symbol: "LTC",
    name: "Litecoin",
    iconColor: "#94a3b8",
    sortOrder: 11,
    networks: [
      {
        id: "w-ltc",
        networkCode: "LTC",
        networkLabel: "Litecoin Network",
        walletAddress: "ltc1exampleRyvonXLTCDepositWallet",
        minDeposit: 0.1,
      },
    ],
  },
  {
    symbol: "POL",
    name: "Polygon",
    iconColor: "#8b5cf6",
    sortOrder: 12,
    networks: [
      {
        id: "w-pol",
        networkCode: "POLYGON",
        networkLabel: "Polygon Network",
        walletAddress: "0xExampleRyvonXPOLDepositWallet",
        minDeposit: 20,
      },
    ],
  },
];

export const MOCK_DEPOSIT_FAQ: DepositFaqItem[] = [
  { id: "faq-1", question: "How to deposit crypto? (Guide)", href: "/faq" },
  { id: "faq-2", question: "Deposit hasn't arrived?" },
  { id: "faq-3", question: "Deposit & withdrawal status" },
  { id: "faq-4", question: "View all deposit & withdrawal records" },
  { id: "faq-5", question: "How to deposit via bank card?" },
];

export const MOCK_RECENT_CRYPTO_DEPOSITS: RecentCryptoDeposit[] = [
  {
    id: "dep-1",
    symbol: "USDT",
    network: "TRC20",
    amount: 500,
    cryptoAmount: 500,
    status: "completed",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];
