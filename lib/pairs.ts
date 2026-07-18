// Curated swap pairs used for programmatic SEO landing pages (/swap/[pair]).
//
// These replace the old auto-generated keyword sitemap. Every page is a real,
// useful page: live reference rate, how-to steps and FAQs. Grow this list
// deliberately — quality over quantity keeps Google happy.

export type PairToken = {
  symbol: string; // ticker, e.g. BTC
  network: string; // Exolix/Rango network name, e.g. BTC
  name: string; // human name, e.g. Bitcoin
  chainName: string; // human chain name, e.g. Bitcoin
};

export type SwapPair = {
  slug: string; // url slug, e.g. btc-to-eth
  from: PairToken;
  to: PairToken;
};

const T = (
  symbol: string,
  network: string,
  name: string,
  chainName: string,
): PairToken => ({ symbol, network, name, chainName });

export const TOKENS = {
  BTC: T("BTC", "BTC", "Bitcoin", "Bitcoin"),
  ETH: T("ETH", "ETH", "Ethereum", "Ethereum"),
  SOL: T("SOL", "SOL", "Solana", "Solana"),
  XMR: T("XMR", "XMR", "Monero", "Monero"),
  LTC: T("LTC", "LTC", "Litecoin", "Litecoin"),
  DOGE: T("DOGE", "DOGE", "Dogecoin", "Dogecoin"),
  TRX: T("TRX", "TRX", "TRON", "TRON"),
  BNB: T("BNB", "BSC", "BNB", "BNB Smart Chain"),
  USDT_ERC20: T("USDT", "ETH", "Tether (ERC-20)", "Ethereum"),
  USDT_TRC20: T("USDT", "TRX", "Tether (TRC-20)", "TRON"),
  USDC_ERC20: T("USDC", "ETH", "USD Coin (ERC-20)", "Ethereum"),
  DAI: T("DAI", "ETH", "Dai", "Ethereum"),
  ARB: T("ARB", "ARBITRUM", "Arbitrum", "Arbitrum"),
  TON: T("TON", "TON", "Toncoin", "TON"),
  AVAX: T("AVAX", "AVAX", "Avalanche", "Avalanche C-Chain"),
  DASH: T("DASH", "DASH", "Dash", "Dash"),
  DOT: T("DOT", "DOT", "Polkadot", "Polkadot"),
} as const;

const pair = (slug: string, from: PairToken, to: PairToken): SwapPair => ({
  slug,
  from,
  to,
});

export const SWAP_PAIRS: SwapPair[] = [
  pair("btc-to-eth", TOKENS.BTC, TOKENS.ETH),
  pair("eth-to-btc", TOKENS.ETH, TOKENS.BTC),
  pair("btc-to-usdt", TOKENS.BTC, TOKENS.USDT_ERC20),
  pair("usdt-to-btc", TOKENS.USDT_ERC20, TOKENS.BTC),
  pair("eth-to-usdt", TOKENS.ETH, TOKENS.USDT_ERC20),
  pair("usdt-to-eth", TOKENS.USDT_ERC20, TOKENS.ETH),
  pair("btc-to-sol", TOKENS.BTC, TOKENS.SOL),
  pair("sol-to-btc", TOKENS.SOL, TOKENS.BTC),
  pair("eth-to-sol", TOKENS.ETH, TOKENS.SOL),
  pair("sol-to-eth", TOKENS.SOL, TOKENS.ETH),
  pair("btc-to-xmr", TOKENS.BTC, TOKENS.XMR),
  pair("xmr-to-btc", TOKENS.XMR, TOKENS.BTC),
  pair("eth-to-xmr", TOKENS.ETH, TOKENS.XMR),
  pair("xmr-to-eth", TOKENS.XMR, TOKENS.ETH),
  pair("usdt-to-xmr", TOKENS.USDT_ERC20, TOKENS.XMR),
  pair("xmr-to-usdt", TOKENS.XMR, TOKENS.USDT_ERC20),
  pair("btc-to-ltc", TOKENS.BTC, TOKENS.LTC),
  pair("ltc-to-btc", TOKENS.LTC, TOKENS.BTC),
  pair("btc-to-doge", TOKENS.BTC, TOKENS.DOGE),
  pair("eth-to-bnb", TOKENS.ETH, TOKENS.BNB),
  pair("bnb-to-eth", TOKENS.BNB, TOKENS.ETH),
  pair("btc-to-trx", TOKENS.BTC, TOKENS.TRX),
  pair("eth-to-trx", TOKENS.ETH, TOKENS.TRX),
  pair("usdt-erc20-to-usdt-trc20", TOKENS.USDT_ERC20, TOKENS.USDT_TRC20),
  pair("usdt-trc20-to-usdt-erc20", TOKENS.USDT_TRC20, TOKENS.USDT_ERC20),
  pair("usdt-to-usdc", TOKENS.USDT_ERC20, TOKENS.USDC_ERC20),
  pair("usdc-to-usdt", TOKENS.USDC_ERC20, TOKENS.USDT_ERC20),
  pair("eth-to-dai", TOKENS.ETH, TOKENS.DAI),
  pair("btc-to-ton", TOKENS.BTC, TOKENS.TON),
  pair("ton-to-btc", TOKENS.TON, TOKENS.BTC),
  pair("eth-to-arb", TOKENS.ETH, TOKENS.ARB),
  pair("sol-to-usdt", TOKENS.SOL, TOKENS.USDT_ERC20),
  pair("btc-to-avax", TOKENS.BTC, TOKENS.AVAX),
  pair("eth-to-dot", TOKENS.ETH, TOKENS.DOT),
  pair("btc-to-dash", TOKENS.BTC, TOKENS.DASH),
];

export function getPairBySlug(slug: string): SwapPair | undefined {
  return SWAP_PAIRS.find((p) => p.slug === slug);
}
