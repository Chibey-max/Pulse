// === Numbers

/*
  Collateral scale is read from decimals() at runtime (6dp testnet, 18dp mainnet). These
  helpers take the already-scaled human number; the SDK wrapper does the bigint math.
*/
export function formatAmount(value: number, fractionDigits = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatUsd(value: string | number): string {
  const n = typeof value === "string" ? Number(value.replace(/,/g, "")) : value;
  return Number.isFinite(n) ? `$${formatAmount(n)}` : "$--";
}

export function formatProbability(value: number | null): string {
  return value === null ? "--" : value.toFixed(2);
}

export function formatSigned(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatAmount(value)}`;
}

// === Identifiers

export function truncateHex(hex: string, lead = 6, tail = 4): string {
  if (hex.length <= lead + tail + 2) return hex;
  return `${hex.slice(0, lead)}...${hex.slice(-tail)}`;
}

// === Time

export function formatLocalTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// === Effective contracts

/* stake / price, the pre-confirmation figure shown before a call. */
export function effectiveContracts(stake: number, price: number): number {
  if (price <= 0) return 0;
  return stake / price;
}
