export const EXOLIX_BLOCKCHAIN_NAME_MAP: Record<string, string> = {
  "BTC": "BTC",
  "Tron": "TRX",
  "BSC": "BSC",
  "ETH": "ETH",
  "Base": "BASE",
  "Scroll": "SCROLL",
  "Optimism": "OPTIMISM",
  "Arbitrum": "ARBITRUM",
  "Ton": "TON",
  "Solana": "SOL",
  "Avax": "AVAX",
  "Celo": "CELO",
  "DASH": "DASH",
  "Doge": "DOGE",
  "LTC": "LTC",
  "Taiko": "TAIKO",
}

export const MAP_BLOCKCHAIN_RANGO_2_EXOLIX: Record<string, string> = {
  "TRON": "TRX",
  "OSMOSIS": "OSMO",
  "SOLANA": "SOL",
  "POLYGON": "MATIC",
  // "BTC": "BTC",
  // "ETH": "ETH",
  // "BSC": "BSC",
  // "ARBITRUM": "ARBITRUM",
  // "STARKNET": "STARKNET",
  // "OPTIMISM": "OPTIMISM",
  // "BASE": "BASE",
  // "TON": "TON",
  // "AURORA": "AURORA",
  // "LTC": "LTC",
  // "BCH": "BCH",
  // "DOGE": "DOGE",
  // "TAIKO": "TAIKO",
  // "DASH": "DASH",
  // "CELO": "CELO",
}

export function getExolixflipBlockchainName(key: string): string | undefined {
  // Case-insensitive lookup — Rango chain names are all-caps ("BTC", "ETH"),
  // while this map mixes cases ("Tron", "BTC"). The old TitleCase normalize
  // silently dropped every all-caps chain (BTC, ETH, BSC, LTC...).
  const entry = Object.entries(EXOLIX_BLOCKCHAIN_NAME_MAP).find(
    ([mapKey]) => mapKey.toLowerCase() === key.toLowerCase()
  );
  return entry?.[1];
}

// Resolve a coin's `blockchain` value to an Exolix network code.
// DB-sourced coins already carry the Exolix code ("XMR", "TRX", ...) — pass
// it through when it matches a known Exolix network. Rango-sourced coins
// carry Rango chain names ("SOLANA", ...) — translate via the map, falling
// back to the raw value so callers behave deterministically.
export function resolveExolixNetwork(
  blockchain: string | undefined,
  exolixNetworks: { network: string }[],
): string | undefined {
  if (!blockchain) return undefined;
  if (exolixNetworks.some((n) => n.network === blockchain)) return blockchain;
  return getExolixflipBlockchainName(blockchain) ?? blockchain;
}
