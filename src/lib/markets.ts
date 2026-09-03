import {
  isBinaryMarket,
  SOMNIA_TESTNET_ADDRESSES,
  SOMNIA_MAINNET_ADDRESSES,
  SomniaMarkets,
  type BinaryMarket,
  type SomniaMarketsConfig,
  type UnifiedOrder,
} from "@somnia-chain/markets-sdk";
import type { WalletClient } from "viem";
import { getPulseChain, SOMNIA_MAINNET_CHAIN_ID } from "./chain";
import type { CallSide, MarketCard, PulsePair, PulseWindow, WindowStatus } from "./types";

type PulseMarketFilters = {
  pair?: PulsePair;
  window?: PulseWindow;
};

export function createPulseExchange(walletClient?: WalletClient) {
  const chain = getPulseChain();
  const config: SomniaMarketsConfig = {
    chain,
    addresses:
      chain.id === SOMNIA_MAINNET_CHAIN_ID ? SOMNIA_MAINNET_ADDRESSES : SOMNIA_TESTNET_ADDRESSES,
    indexerUrl: requiredPublicEnv("NEXT_PUBLIC_INDEXER_URL"),
    wsRpcUrl: requiredPublicEnv("NEXT_PUBLIC_WS_RPC_URL"),
    walletClient,
  };

  return new SomniaMarkets(config);
}

export async function loadPulseMarkets(
  exchange = createPulseExchange(),
  filters: PulseMarketFilters = {},
) {
  const markets = await exchange.loadMarkets(true);

  return Object.values(markets)
    .filter((market) => market.type === "binary" && isBinaryMarket(market.info))
    .map((market) => toMarketCard(market.info as BinaryMarket))
    .filter((market) => isSupportedMarket(market, filters))
    .sort((a, b) => a.expiryTs - b.expiryTs);
}

export async function getMarketCard(exchange: SomniaMarkets, marketId: `0x${string}`) {
  const markets = await loadPulseMarkets(exchange);
  return markets.find((market) => market.marketId.toLowerCase() === marketId.toLowerCase()) ?? null;
}

export async function loadTopOfBook(exchange: SomniaMarkets, outcomeSymbol: string, depth = 3) {
  const book = await exchange.fetchOrderBook(outcomeSymbol, depth);
  const bestAsk = book.asks[0]?.[0] ?? null;
  const bestBid = book.bids[0]?.[0] ?? null;
  const mid = bestAsk !== null && bestBid !== null ? (bestAsk + bestBid) / 2 : (bestAsk ?? bestBid);

  return {
    symbol: book.symbol,
    bids: book.bids.slice(0, depth),
    asks: book.asks.slice(0, depth),
    upPrice: clampProbability(mid),
    downPrice: mid === null ? null : clampProbability(1 - mid),
    timestamp: book.timestamp,
  };
}

export async function placeMarketableCall(
  exchange: SomniaMarkets,
  market: MarketCard,
  side: CallSide,
  stake: number,
): Promise<UnifiedOrder> {
  const status = await exchange.client.getMarketOnchain(market.marketId);
  if (status.status !== 1) {
    throw new Error(`Market ${market.marketId} is not trading`);
  }

  const outcomeSymbol = getOutcomeSymbol(market.symbol, side);
  return exchange.createOrder(outcomeSymbol, "market", "buy", stake, undefined, {
    timeInForce: "IOC",
  });
}

export async function cancelOrder(exchange: SomniaMarkets, orderId: string, outcomeSymbol: string) {
  return exchange.cancelOrder(orderId, outcomeSymbol);
}

export function getOutcomeSymbol(marketSymbol: string, side: CallSide) {
  return `${marketSymbol}#${side === "up" ? "YES" : "NO"}`;
}

// === Live read path (marketing hero, /markets, mini book)

const PULSE_ASSETS = new Set(["BTC", "ETH"]);
const PULSE_WINDOWS = new Set<PulseWindow>(["15m", "1h"]);

export interface LiveWindow extends MarketCard {
  /* Kept off MarketCard so components stay presentational; the live book path needs them. */
  poolAddress: `0x${string}`;
  quoteDecimals: number;
}

/*
  Currently-live BTC/ETH 15m and 1h windows, soonest-to-expire first. Uses
  `listLiveBinaryMarkets` (already `expiry > now`, paginated) rather than `loadMarkets(true)`,
  which walks the full historical set.
*/
export async function loadLiveWindows(exchange = createPulseExchange()): Promise<LiveWindow[]> {
  const rows = await exchange.client.listLiveBinaryMarkets({ limit: 40, orderBy: "closingSoon" });

  const windows = rows
    .filter((row) => PULSE_ASSETS.has(row.asset.toUpperCase()))
    .filter((row) => PULSE_WINDOWS.has((row.interval ?? "") as PulseWindow))
    .map(toLiveWindow);

  const openingByMarket = await safeOpeningPrices(
    exchange,
    windows.map((w) => w.marketId),
  );

  return windows.map((w) => ({
    ...w,
    strike: openingByMarket[w.marketId.toLowerCase()] ?? w.strike,
  }));
}

export async function getLiveWindow(
  marketId: string,
  exchange = createPulseExchange(),
): Promise<LiveWindow | null> {
  const windows = await loadLiveWindows(exchange);
  return windows.find((w) => w.marketId.toLowerCase() === marketId.toLowerCase()) ?? null;
}

export interface BinaryBook {
  asks: Array<{ price: number; size: number }>;
  bids: Array<{ price: number; size: number }>;
  upPrice: number | null;
  downPrice: number | null;
}

/*
  Resting book for one window, in Up (YES) terms. Down is always 1 - Up, derived here so
  the UI never treats it as a second feed.
*/
export async function fetchBinaryBook(
  window: Pick<LiveWindow, "poolAddress" | "quoteDecimals">,
  exchange = createPulseExchange(),
  depth = 5,
): Promise<BinaryBook> {
  const scale = 10 ** window.quoteDecimals;
  const book = await exchange.client.getBinaryOrderBook(window.poolAddress, {
    depth,
    decimals: window.quoteDecimals,
  });

  const level = (l: { price: bigint; quantity: bigint }) => ({
    price: Number(l.price) / scale,
    size: Number(l.quantity) / scale,
  });

  const asks = book.yesAsks.map(level);
  const bids = book.yesBids.map(level);
  const bestAsk = asks[0]?.price ?? null;
  const bestBid = bids[0]?.price ?? null;
  const mid = bestAsk !== null && bestBid !== null ? (bestAsk + bestBid) / 2 : (bestAsk ?? bestBid);

  return {
    asks,
    bids,
    upPrice: clampProbability(mid),
    downPrice: mid === null ? null : clampProbability(1 - mid),
  };
}

// === Live mapping helpers

function toLiveWindow(row: BinaryMarket): LiveWindow {
  const card = toMarketCard(row);
  const now = Math.floor(Date.now() / 1000);
  const start = Number(row.tradingStart);
  const expiry = Number(row.expiry);

  return {
    ...card,
    // listLiveBinaryMarkets only returns expiry > now, so the row's `status` string
    // (which can lag) never needs to be trusted for a terminal state here.
    status: now < start ? "listed" : now < expiry ? "trading" : "locked",
    strike: "",
    poolAddress: row.poolAddress,
    quoteDecimals: row.quoteDecimals,
  };
}

async function safeOpeningPrices(
  exchange: SomniaMarkets,
  marketIds: string[],
): Promise<Record<string, string>> {
  if (marketIds.length === 0) return {};
  try {
    const raw = await exchange.client.getOpeningPrices(marketIds);
    const out: Record<string, string> = {};
    for (const [id, value] of Object.entries(raw)) {
      const display = displayStrike(value);
      if (display) out[id.toLowerCase()] = display;
    }
    return out;
  } catch {
    // The opening-price query on the dev indexer is intermittently unavailable. A missing
    // strike is a "—" in the UI, never a blocker on the market list.
    return {};
  }
}

/*
  The opening price comes back raw in the oracle's price scale, which is not carried on the
  row. Try the two plausible scales and keep the one that lands in a sane band for a
  BTC/ETH USD price; otherwise show nothing rather than a fabricated number.
*/
function displayStrike(raw: string | null): string | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;

  for (const scale of [1e2, 1e8, 1]) {
    const price = n / scale;
    if (price >= 200 && price <= 500_000) {
      return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
    }
  }
  return null;
}

function toMarketCard(market: BinaryMarket): MarketCard {
  const pair = normalizePair(market.asset);
  const window = normalizeWindow(market.interval);
  const status = normalizeStatus(market.status, Number(market.tradingStart), Number(market.expiry));
  const lastUpPrice = market.lastPrice
    ? Number(market.lastPrice) / 10 ** market.quoteDecimals
    : null;

  return {
    marketId: market.marketId,
    symbol: marketSymbol(market),
    pair,
    window,
    strike: market.strike,
    expiryTs: Number(market.expiry),
    status,
    upPrice: clampProbability(lastUpPrice),
    downPrice: lastUpPrice === null ? null : clampProbability(1 - lastUpPrice),
  };
}

function marketSymbol(market: BinaryMarket) {
  return `${market.asset}-${market.interval ?? "window"}/${market.collateral}`;
}

function normalizePair(asset: string): PulsePair {
  return asset.toUpperCase() === "BTC" ? "BTC" : "ETH";
}

function normalizeWindow(interval?: string | null): PulseWindow {
  return interval === "1h" ? "1h" : "15m";
}

function normalizeStatus(status: string, tradingStart?: number, expiry?: number): WindowStatus {
  const now = Math.floor(Date.now() / 1000);
  if (status === "Voided") return "voided";
  if (status === "Resolved" || status === "Finalized") return "resolved";
  if (status === "Locked" || status === "Settling") return "locked";
  if (status === "Trading") return "trading";
  if (tradingStart && expiry && now >= tradingStart && now < expiry) return "trading";
  if (expiry && now >= expiry) return "locked";
  return "listed";
}

function requiredPublicEnv(name: "NEXT_PUBLIC_INDEXER_URL" | "NEXT_PUBLIC_WS_RPC_URL") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to create a Pulse exchange`);
  }

  return value;
}

function isSupportedMarket(market: MarketCard, filters: PulseMarketFilters) {
  if (filters.pair && market.pair !== filters.pair) return false;
  if (filters.window && market.window !== filters.window) return false;
  return market.pair === "BTC" || market.pair === "ETH";
}

function clampProbability(value: number | null) {
  if (value === null || Number.isNaN(value)) return null;
  return Math.min(1, Math.max(0, value));
}
