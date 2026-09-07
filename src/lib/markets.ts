import {
  isBinaryMarket,
  SOMNIA_TESTNET_ADDRESSES,
  SOMNIA_MAINNET_ADDRESSES,
  SomniaMarkets,
  type BinaryMarket,
  type SomniaMarketsConfig,
  type UnifiedOrder,
} from "@somnia-chain/markets-sdk";
import { createPublicClient, http, parseAbi, type Address, type WalletClient } from "viem";
import { getPulseChain, SOMNIA_MAINNET_CHAIN_ID } from "./chain";
import type { CallSide, MarketCard, PulsePair, PulseWindow, WindowStatus } from "./types";

export const SOMNIA_TESTNET_INDEXER_URL = "https://dev.smk.somnia.host/v1/graphql";
export const SOMNIA_TESTNET_WS_RPC_URL = "wss://api.infra.testnet.somnia.network/ws";

const PUBLIC_INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL ?? SOMNIA_TESTNET_INDEXER_URL;
const PUBLIC_WS_RPC_URL = process.env.NEXT_PUBLIC_WS_RPC_URL ?? SOMNIA_TESTNET_WS_RPC_URL;

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
    indexerUrl: PUBLIC_INDEXER_URL,
    wsRpcUrl: PUBLIC_WS_RPC_URL,
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

  await exchange.loadMarkets();

  const { marketSymbol } = exchange.market(market.marketId);
  const outcomeSymbol = getOutcomeSymbol(marketSymbol, side);
  return exchange.createOrder(outcomeSymbol, "market", "buy", stake, undefined, {
    timeInForce: "IOC",
  });
}

export async function cancelOrder(exchange: SomniaMarkets, orderId: string, outcomeSymbol: string) {
  await exchange.loadMarkets();
  return exchange.cancelOrder(orderId, outcomeSymbol);
}

export function getOutcomeSymbol(marketSymbol: string, side: CallSide) {
  return `${marketSymbol}#${side === "up" ? "YES" : "NO"}`;
}

// === Live read path (marketing hero, /markets, mini book)

const PULSE_ASSETS = new Set(["BTC", "ETH"]);
const PULSE_WINDOWS = new Set<PulseWindow>(["15m", "1h"]);
const CURRENT_ROLLING_CREATORS = [
  /*
    Current DreamDEX rolling creator observed on Shannon for the BTC/ETH 1h series.
    The SDK's baked marketCreator address still points at an older creator whose 15m/1h
    series expired, so the live board reads creator state directly before falling back to
    the indexer.
  */
  "0x94D963B6670AB96E78C8d0C46ca35D196d606EFE",
] as const satisfies readonly Address[];
const MARKET_CREATOR_SERIES = [
  { seriesId: 1, asset: "BTC", window: "15m" },
  { seriesId: 2, asset: "ETH", window: "15m" },
  { seriesId: 3, asset: "BTC", window: "1h" },
  { seriesId: 4, asset: "ETH", window: "1h" },
] as const satisfies ReadonlyArray<{ seriesId: number; asset: PulsePair; window: PulseWindow }>;
const PULSE_QUOTE_DECIMALS = 6;

const CURRENT_CREATOR_ENV = process.env.NEXT_PUBLIC_MARKET_CREATORS;
const PULSE_MARKET_CREATORS = (
  CURRENT_CREATOR_ENV
    ? CURRENT_CREATOR_ENV.split(",")
        .map((item) => item.trim())
        .filter((item): item is Address => /^0x[a-fA-F0-9]{40}$/.test(item))
    : CURRENT_ROLLING_CREATORS
) as readonly Address[];

const marketCreatorLiveAbi = parseAbi([
  "function referenceQidBySeries(uint32 seriesId) view returns (uint256 qid)",
]);

const oracleHubLiveAbi = parseAbi([
  "function marketsForQuestion(uint256 oracleQuestionId) view returns (bytes32[] markets)",
]);

const binaryModuleLiveAbi = parseAbi([
  "function markets(bytes32 marketId) view returns ((uint256 oracleQuestionId, uint8 outcomeSlotCount, uint8 voidPolicy, address collateral, uint32 originOperatorId, bytes32 originVenueId, address oracleAdapter, address creator, address market, address pool, uint256 yesId, uint256 noId, uint64 tradingStart, uint64 expiry) record)",
]);

export interface LiveWindow extends MarketCard {
  /* Kept off MarketCard so components stay presentational; the live book path needs them. */
  poolAddress: `0x${string}`;
  quoteDecimals: number;
  /* Settlement outcome, for computing an actual redeemable payout rather than assuming
     every held contract is worth its face value (see estPayoutFor in live.ts). */
  winningOutcome: number | null;
  voided: boolean;
}

/*
  Currently-live BTC/ETH 15m and 1h windows, soonest-to-expire first. Uses
  `listLiveBinaryMarkets` (already `expiry > now`, paginated) rather than `loadMarkets(true)`,
  which walks the full historical set.
*/
export async function loadLiveWindows(exchange = createPulseExchange()): Promise<LiveWindow[]> {
  const onchain = await loadLiveWindowsFromCreators();
  if (onchain.length > 0) return onchain;

  const rows = await withTimeout(
    exchange.client.listLiveBinaryMarkets({ limit: 40, orderBy: "closingSoon" }),
    4_000,
    "live binary market list",
  );

  const windows = rows
    .filter((row) => PULSE_ASSETS.has(row.asset.toUpperCase()))
    .filter((row) => PULSE_WINDOWS.has((row.interval ?? "") as PulseWindow))
    .map(toLiveWindow);

  const openingByMarket = await safeOpeningPrices(
    windows.map((w) => w.marketId),
    exchange,
  );

  return windows.map((w) => ({
    ...w,
    strike: openingByMarket[w.marketId.toLowerCase()] ?? w.strike,
  }));
}

async function loadLiveWindowsFromCreators(): Promise<LiveWindow[]> {
  if (PULSE_MARKET_CREATORS.length === 0) return [];

  try {
    const chain = getPulseChain();
    const addresses =
      chain.id === SOMNIA_MAINNET_CHAIN_ID ? SOMNIA_MAINNET_ADDRESSES : SOMNIA_TESTNET_ADDRESSES;
    const binaryModule = addresses.binaryModule;
    const oracleHub = addresses.oracleHub;
    if (!binaryModule || !oracleHub) return [];

    const publicClient = createPublicClient({
      chain,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL),
    });
    const now = Math.floor(Date.now() / 1000);

    const qidCalls = PULSE_MARKET_CREATORS.flatMap((creator) =>
      MARKET_CREATOR_SERIES.map((series) => ({
        ...series,
        creator,
        contract: {
          address: creator,
          abi: marketCreatorLiveAbi,
          functionName: "referenceQidBySeries",
          args: [series.seriesId],
        },
      })),
    );

    const qidResults = await publicClient.multicall({
      allowFailure: true,
      contracts: qidCalls.map((call) => call.contract),
    });

    const candidates: Array<{
      asset: PulsePair;
      window: PulseWindow;
      qid: bigint;
    }> = [];

    qidCalls.forEach((call, index) => {
      const qid = qidResults[index];
      if (qid.status !== "success" || qid.result === BigInt(0)) return;

      candidates.push({
        asset: call.asset,
        window: call.window,
        qid: qid.result as bigint,
      });
    });

    const marketIdResults = await publicClient.multicall({
      allowFailure: true,
      contracts: candidates.map((candidate) => ({
        address: oracleHub,
        abi: oracleHubLiveAbi,
        functionName: "marketsForQuestion",
        args: [candidate.qid],
      })),
    });

    const marketCandidates = candidates
      .map((candidate, index) => {
        const result = marketIdResults[index];
        if (result.status !== "success") return null;
        const marketIds = result.result as readonly `0x${string}`[];
        const marketId = marketIds[marketIds.length - 1];
        return marketId ? { ...candidate, marketId } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const [recordResults, openingByMarket] = await Promise.all([
      publicClient.multicall({
        allowFailure: true,
        contracts: marketCandidates.map((candidate) => ({
          address: binaryModule,
          abi: binaryModuleLiveAbi,
          functionName: "markets",
          args: [candidate.marketId],
        })),
      }),
      safeOpeningPrices(marketCandidates.map((candidate) => candidate.marketId)),
    ]);

    const rows: Array<LiveWindow | null> = marketCandidates.map((candidate, index) => {
      const result = recordResults[index];
      if (result.status !== "success") return null;
      const record = result.result as {
        collateral: Address;
        pool: Address;
        tradingStart: bigint;
        expiry: bigint;
      };
      if (Number(record.expiry) <= now) return null;

      return {
        marketId: candidate.marketId,
        symbol: `${candidate.asset}-${candidate.window}`,
        pair: candidate.asset,
        window: candidate.window,
        strike: openingByMarket[candidate.marketId.toLowerCase()] ?? "",
        expiryTs: Number(record.expiry),
        status: (now < Number(record.tradingStart) ? "listed" : "trading") as WindowStatus,
        upPrice: null,
        downPrice: null,
        poolAddress: record.pool,
        quoteDecimals: PULSE_QUOTE_DECIMALS,
        winningOutcome: null,
        voided: false,
      } satisfies LiveWindow;
    });

    return rows
      .filter((row): row is LiveWindow => row !== null)
      .sort((a, b) => a.expiryTs - b.expiryTs);
  } catch (error) {
    /*
      Swallowing this silently made an empty board undiagnosable: the creator path would
      fail, the indexer fallback would return nothing, and the desk rendered "no live
      window" with a clean console while four windows were live on chain.
    */
    console.error("[pulse] live window discovery failed, falling back to the indexer", error);
    return [];
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
    winningOutcome: row.winningOutcome,
    voided: row.voided,
  };
}

async function safeOpeningPrices(
  marketIds: string[],
  exchange?: SomniaMarkets,
): Promise<Record<string, string>> {
  if (marketIds.length === 0) return {};
  try {
    return await fetchOpeningPrices(marketIds);
  } catch {
    if (!exchange) return {};
  }

  try {
    return await withTimeout(
      exchange.client.getOpeningPrices(marketIds).then(formatOpeningPriceMap),
      4_000,
      "opening prices",
    );
  } catch {
    return {};
  }
}

/*
  The strike lives behind two small indexer queries (market -> reference question ->
  oracle answer). Measured on Shannon they answer in ~0.5-1.5s but spike past 4s, so the
  pair shares ONE budget rather than a timeout each: two 2.5s caps bound the worst case at
  5s, which is worse than the spike we are trying to survive. This runs alongside the
  chain multicalls that already cost ~2.7s, so in the common case it is free, and a stalled
  indexer costs a blank strike rather than a blank board.
*/
const OPENING_PRICE_BUDGET_MS = 5_000;

async function fetchOpeningPrices(marketIds: string[]): Promise<Record<string, string>> {
  const deadline = Date.now() + OPENING_PRICE_BUDGET_MS;
  const remaining = () => Math.max(0, deadline - Date.now());

  const ids = marketIds.map((id) => id.toLowerCase());
  const refs = await gqlWithTimeout<{
    MarketReferenceLink: Array<{ market: string; referenceQuestionId: string }>;
  }>(
    `
      query OpeningRefs($ids: [String!]) {
        MarketReferenceLink(where: { market_id: { _in: $ids } }) {
          market: market_id
          referenceQuestionId
        }
      }
    `,
    { ids },
    remaining(),
  );

  const qids = [...new Set(refs.MarketReferenceLink.map((row) => row.referenceQuestionId))];
  if (qids.length === 0) return {};

  const answers = await gqlWithTimeout<{
    OracleAnswer: Array<{ id: string; numericValue: string | null }>;
  }>(
    `
      query OpeningAnswers($qids: [String!]) {
        OracleAnswer(where: { id: { _in: $qids } }) {
          id
          numericValue
        }
      }
    `,
    { qids },
    remaining(),
  );

  const valueByQid = new Map(answers.OracleAnswer.map((row) => [row.id, row.numericValue]));
  const raw: Record<string, string | null> = {};
  for (const ref of refs.MarketReferenceLink) {
    raw[ref.market.toLowerCase()] = valueByQid.get(ref.referenceQuestionId) ?? null;
  }

  return formatOpeningPriceMap(raw);
}

async function gqlWithTimeout<TData>(
  query: string,
  variables: Record<string, unknown>,
  timeoutMs: number,
): Promise<TData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(PUBLIC_INDEXER_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Indexer request failed with ${response.status}`);
    const payload = (await response.json()) as { data?: TData; errors?: unknown };
    if (!payload.data || payload.errors) throw new Error("Indexer returned no opening data");
    return payload.data;
  } finally {
    clearTimeout(timer);
  }
}

function formatOpeningPriceMap(raw: Record<string, string | null>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, value] of Object.entries(raw)) {
    const display = displayStrike(value);
    if (display) out[id.toLowerCase()] = display;
  }
  return out;
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

function isSupportedMarket(market: MarketCard, filters: PulseMarketFilters) {
  if (filters.pair && market.pair !== filters.pair) return false;
  if (filters.window && market.window !== filters.window) return false;
  return market.pair === "BTC" || market.pair === "ETH";
}

function clampProbability(value: number | null) {
  if (value === null || Number.isNaN(value)) return null;
  return Math.min(1, Math.max(0, value));
}
