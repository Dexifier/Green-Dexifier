export type Blockchain = {
  id: number | string | null,
  name: string,
  displayName: string,
  shortName: string | null,
  logo: string | null,
  color?: string,
  type?: string, // "EVM" | "COSMOS" | "UTXO" | ... from Rango meta (Exolix networks: undefined)
}

export type Token = {
  address: string | null,
  isPopular?: boolean,
  decimals?: number,
  symbol: string,
  blockchain?: string,
  image?: string,
  usdPrice?: number | null,
}