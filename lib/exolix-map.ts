// Pure mapping helpers for Exolix API payloads -> Dexifier cache shapes.
// Kept free of server-only imports so it can be unit-tested and reused by
// both the DB sync route and the live-API fallback cache.

export type ExolixNetwork = {
  coinNetworkId?: string;
  network: string;
  name: string;
  shortName?: string | null;
  addressRegex?: string | null;
  notes?: string | null;
  isDefault?: boolean;
  decimal?: number | null;
  icon?: string | null;
  blockExplorer?: string | null;
  depositMinAmount?: number | null;
  memoNeeded?: boolean;
  memoName?: string | null;
  memoRegex?: string | null;
  precision?: number;
  contract?: string | null;
  // Exolix sends more (platformTypes, priority, privacy, tokenRegex, ...)
  // which Prisma would reject — toNetworkRow whitelists the schema fields.
  [extra: string]: unknown;
};

export type ExolixCurrency = {
  code: string;
  name: string;
  icon?: string | null;
  notes?: string | null;
  networks?: ExolixNetwork[];
};

export type NetworkRow = ReturnType<typeof toNetworkRow>;
export type CurrencyRow = {
  code: string;
  name: string;
  icon: string | null;
  notes: string | null;
  networkId: number;
};

// Whitelists exactly the fields of the Prisma Network model.
export function toNetworkRow(n: ExolixNetwork) {
  return {
    network: n.network,
    name: n.name ?? n.network,
    shortName: n.shortName ?? null,
    addressRegex: n.addressRegex ?? null,
    notes: n.notes ?? null,
    isDefault: n.isDefault ?? false,
    decimal: n.decimal ?? null,
    icon: n.icon ?? null,
    blockExplorer: n.blockExplorer ?? null,
    depositMinAmount: n.depositMinAmount ?? null,
    memoNeeded: n.memoNeeded ?? false,
    memoName: n.memoName ?? null,
    memoRegex: n.memoRegex ?? null,
    precision: n.precision ?? 0,
    contract: n.contract ?? null,
  };
}

// One Network row per Exolix network code, first occurrence wins.
export function dedupeNetworkRows(currencies: ExolixCurrency[]): NetworkRow[] {
  const byCode = new Map<string, NetworkRow>();
  for (const currency of currencies) {
    for (const n of currency.networks ?? []) {
      if (!byCode.has(n.network)) byCode.set(n.network, toNetworkRow(n));
    }
  }
  return [...byCode.values()];
}

// One Currency row per currency-network pair, linked via idByNetwork.
// Pairs whose network is missing from the map are dropped.
export function toCurrencyRows(
  currencies: ExolixCurrency[],
  idByNetwork: Map<string, number>,
): CurrencyRow[] {
  return currencies.flatMap((c) =>
    (c.networks ?? [])
      .map((n) => ({
        code: c.code,
        name: c.name,
        icon: c.icon ?? null,
        notes: c.notes ?? null,
        networkId: idByNetwork.get(n.network),
      }))
      .filter((r): r is CurrencyRow => r.networkId != null),
  );
}

// Builds the same response shapes the DB-backed routes return
// (DNetwork[] / DCurrency[]), with deterministic synthetic ids so the
// frontend join (`networks.find(n => n.id === currency.networkId)`) works.
export function buildFallbackData(currencies: ExolixCurrency[]): {
  networks: (NetworkRow & { id: number })[];
  currencies: (CurrencyRow & { id: number })[];
} {
  const networks = dedupeNetworkRows(currencies)
    .sort((a, b) => a.network.localeCompare(b.network))
    .map((row, i) => ({ id: i + 1, ...row }));
  const idByNetwork = new Map(networks.map((n) => [n.network, n.id]));
  const rows = toCurrencyRows(currencies, idByNetwork).map((row, i) => ({
    id: i + 1,
    ...row,
  }));
  return { networks, currencies: rows };
}
