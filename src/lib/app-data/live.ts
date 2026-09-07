import { estPayoutFor, type SomniaMarkets } from "@somnia-chain/markets-sdk";
import { createPublicClient, erc20Abi, formatUnits, http, type Address } from "viem";
import { getCollateral, getPulseChain, SOMNIA_SHANNON_RPC_URL } from "@/lib/chain";
import {
  type LiveWindow,
  createPulseExchange,
  fetchBinaryBook,
  getMarketCard,
  loadLiveWindows,
} from "@/lib/markets";
import {
  decodeRule,
  pulseMarketAdapterAbi,
  pulseSessionAbi,
  pulseSessionFactoryAbi,
} from "@/lib/session";
import type { CallSide, MarketCard, Position, SessionState, Tape, WindowStatus } from "@/lib/types";
import { formatAmount, formatMarketId } from "@/lib/format";
import { MARKET_ADAPTER_ADDRESS, SESSION_FACTORY_ADDRESS } from "./config";
import type { OrderBook, PulseDataSource, Redeemable, TapeEntry, TapeKind } from "./types";

/*
  Live read-only data source. Markets and order books come from the Somnia SDK/indexer.
  Session state and session-held positions are reconciled from the deployed Pulse
  factory/session/adapter contracts so the app is not dependent on a bespoke backend.
*/

const EMPTY_TAPE: Tape = {
  realized: "0",
  unclaimed: "0",
  todayCalls: 0,
  todayWins: 0,
  streak: 0,
  autoClaims: 0,
};

// === Exchange singleton

/*
  One SomniaMarkets per browser tab. The SDK opens no socket until a watch/tail verb is
  called, and none of the read verbs used here do, so construction is cheap and safe to
  memoise at module scope on the client.
*/
let exchange: SomniaMarkets | null = null;
let publicClient: ReturnType<typeof createPublicClient> | null = null;

function getExchange(): SomniaMarkets {
  exchange ??= createPulseExchange();
  return exchange;
}

function getPublicClient(): ReturnType<typeof createPublicClient> {
  publicClient ??= createPublicClient({
    chain: getPulseChain(),
    transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? SOMNIA_SHANNON_RPC_URL),
  });
  return publicClient;
}

// === Window cache

/*
  loadLiveWindows carries poolAddress and quoteDecimals that MarketCard does not. The book
  query needs both, so the last listing is kept here and getOrderBook looks the window up
  by marketId rather than re-fetching the whole board.
*/
let lastWindows: LiveWindow[] = [];

function toCard(window: LiveWindow): MarketCard {
  const { poolAddress: _pool, quoteDecimals: _qd, ...card } = window;
  return card;
}

function rawAmount(value: bigint | string, decimals: number): string {
  return formatAmount(Number(formatUnits(BigInt(value), decimals)));
}

function liveStatus(status: string): WindowStatus {
  if (status === "Voided") return "voided";
  if (status === "Resolved" || status === "Finalized") return "resolved";
  if (status === "Locked" || status === "Settling") return "locked";
  if (status === "Trading") return "trading";
  return "listed";
}

function sideFromOutcome(outcome: 0 | 1 | number): CallSide {
  return outcome === 0 ? "up" : "down";
}

function sideFromOrder(side: string | null): CallSide | undefined {
  if (!side) return undefined;
  return side.endsWith("YES") ? "up" : "down";
}

function kindFromOrderStatus(status: string): TapeKind {
  if (status === "Cancelled" || status === "Expired") return "cancelled";
  if (status === "Filled" || status === "Closed") return "filled";
  return "placed";
}

function symbolFromMarket(asset: string | null | undefined, interval: string | null | undefined) {
  return `${asset?.toUpperCase() ?? "Market"}-${interval ?? "window"}`;
}

function statusFromOnchain(status: number, isResolved: boolean, isVoided: boolean): WindowStatus {
  if (isVoided) return "voided";
  if (isResolved) return "resolved";
  if (status === 0) return "listed";
  if (status === 1) return "trading";
  return "locked"; // 2 Locked, 3 Settling — no settled outcome to show yet
}

/*
 * The RPC caps eth_getLogs at a 1000-block range, so `fromBlock: "earliest"` throws outright
 * — every session-log read below needs a real, bounded starting block. Binary-searching the
 * session's own creation block (an EIP-1167 clone: bytecode is absent, then present, exactly
 * once) costs ~15 eth_getCode calls regardless of how old the factory gets, which stays cheap
 * forever — unlike paginating from the factory's deploy block, which grows every block.
 * Memoized per session since a creation block never changes once found.
 */
const creationBlockCache = new Map<string, bigint>();

async function getContractCreationBlock(address: Address): Promise<bigint> {
  const cached = creationBlockCache.get(address.toLowerCase());
  if (cached !== undefined) return cached;

  const client = getPublicClient();
  let lo = BigInt(0);
  let hi = await client.getBlockNumber();

  const hasCode = async (block: bigint) => {
    const code = await client.getCode({ address, blockNumber: block });
    return Boolean(code) && code !== "0x";
  };

  if (!(await hasCode(hi))) return hi; // not deployed at all — nothing to find

  while (lo < hi) {
    const mid = (lo + hi) / BigInt(2);
    if (await hasCode(mid)) hi = mid;
    else lo = mid + BigInt(1);
  }

  creationBlockCache.set(address.toLowerCase(), lo);
  return lo;
}

const LOG_CHUNK_BLOCKS = BigInt(999);

/*
  eth_getLogs in <=1000-block windows from `fromBlock` to `latest`, concatenated.

  Somnia produces ~864,000 blocks a day (100ms blocks), so "scan from the session's
  creation block" grows by ~864 chunks every day it stays open. Firing that as one
  Promise.all pinned the browser's main thread — thousands of concurrent fetches plus a
  viem ABI decode each. Two bounds keep it survivable:

  LOG_FETCH_CONCURRENCY caps how many requests are in flight. MAX_LOG_CHUNKS bounds only
  the FIRST scan for a key — it is a starting window, not a ceiling on history, because
  BACKFILL_CHUNKS walks the range backward on subsequent polls until the contract's
  creation block is covered. Nothing is permanently truncated; it just arrives over a few
  polls instead of in one burst that freezes the tab.
*/
const LOG_FETCH_CONCURRENCY = 8;
const MAX_LOG_CHUNKS = 180; // first scan: 180k blocks, ~5 hours of Shannon at 100ms
const BACKFILL_CHUNKS = 60; // ~60k blocks reclaimed per poll until history is complete

/*
  Chain logs are append-only, so a scanned range never has to be scanned again. Each entry
  records the window it has already covered; a poll then costs one chunk of new blocks
  rather than a rescan, and BACKFILL_CHUNKS of older blocks are reclaimed per call until
  `scannedFrom` reaches the contract's creation block. Full history is reached over a few
  polls instead of in one burst that freezes the tab.
*/
interface LogCacheEntry {
  scannedFrom: bigint;
  scannedTo: bigint;
  logs: unknown[];
}

const logCache = new Map<string, LogCacheEntry>();

/* Bump when the stored shape changes so old entries are ignored rather than misread. */
const LOG_CACHE_VERSION = 1;
const LOG_CACHE_PREFIX = `pulse:logs:v${LOG_CACHE_VERSION}:`;
/* localStorage caps around 5MB per origin; stop persisting an entry well before that. */
const LOG_CACHE_MAX_BYTES = 512_000;

/* JSON has no bigint. Tag them so blockNumber and every uint arg survive a round trip. */
export function encodeLogs(value: unknown): string {
  return JSON.stringify(value, (_key, val) =>
    typeof val === "bigint" ? { __bigint: val.toString() } : val,
  );
}

export function decodeLogs(raw: string): unknown {
  return JSON.parse(raw, (_key, val) =>
    val && typeof val === "object" && typeof (val as { __bigint?: string }).__bigint === "string"
      ? BigInt((val as { __bigint: string }).__bigint)
      : val,
  );
}

function readPersistedLogs(cacheKey: string): LogCacheEntry | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(LOG_CACHE_PREFIX + cacheKey);
    if (!raw) return undefined;
    const parsed = decodeLogs(raw) as LogCacheEntry;
    if (typeof parsed?.scannedFrom !== "bigint" || typeof parsed?.scannedTo !== "bigint") {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

function writePersistedLogs(cacheKey: string, entry: LogCacheEntry): void {
  if (typeof window === "undefined") return;
  try {
    const raw = encodeLogs(entry);
    if (raw.length > LOG_CACHE_MAX_BYTES) return;
    window.localStorage.setItem(LOG_CACHE_PREFIX + cacheKey, raw);
  } catch {
    /* Quota exceeded or storage disabled — the in-memory cache still works. */
  }
}

function sortLogs<T>(logs: T[]): T[] {
  return logs.sort((a, b) => {
    const left = a as { blockNumber?: bigint; logIndex?: number };
    const right = b as { blockNumber?: bigint; logIndex?: number };
    const byBlock = (left.blockNumber ?? BigInt(0)) - (right.blockNumber ?? BigInt(0));
    if (byBlock !== BigInt(0)) return byBlock > BigInt(0) ? 1 : -1;
    return (left.logIndex ?? 0) - (right.logIndex ?? 0);
  });
}

async function fetchRange<T>(
  from: bigint,
  to: bigint,
  fetchChunk: (from: bigint, to: bigint) => Promise<T[]>,
): Promise<T[]> {
  const stride = LOG_CHUNK_BLOCKS + BigInt(1);
  const ranges: Array<[bigint, bigint]> = [];
  for (let start = from; start <= to; start += stride) {
    const end = start + LOG_CHUNK_BLOCKS < to ? start + LOG_CHUNK_BLOCKS : to;
    ranges.push([start, end]);
  }

  const out: T[][] = [];
  for (let i = 0; i < ranges.length; i += LOG_FETCH_CONCURRENCY) {
    const batch = ranges.slice(i, i + LOG_FETCH_CONCURRENCY);
    out.push(...(await Promise.all(batch.map(([start, end]) => fetchChunk(start, end)))));
  }
  return out.flat();
}

export async function getLogsChunked<T>(
  fromBlock: bigint,
  toBlock: bigint,
  fetchChunk: (from: bigint, to: bigint) => Promise<T[]>,
  cacheKey?: string,
): Promise<T[]> {
  const stride = LOG_CHUNK_BLOCKS + BigInt(1);

  if (!cacheKey) {
    const floor = toBlock - stride * BigInt(MAX_LOG_CHUNKS) + BigInt(1);
    return fetchRange(fromBlock > floor ? fromBlock : floor, toBlock, fetchChunk);
  }

  const cached = logCache.get(cacheKey) ?? readPersistedLogs(cacheKey);
  if (cached) logCache.set(cacheKey, cached);

  if (!cached || cached.scannedTo < fromBlock || cached.scannedFrom < fromBlock) {
    /* No usable history: seed with the most recent window and backfill on later polls. */
    const floor = toBlock - stride * BigInt(MAX_LOG_CHUNKS) + BigInt(1);
    const start = fromBlock > floor ? fromBlock : floor;
    const seeded = sortLogs(await fetchRange(start, toBlock, fetchChunk));
    const entry = { scannedFrom: start, scannedTo: toBlock, logs: seeded };
    logCache.set(cacheKey, entry);
    writePersistedLogs(cacheKey, entry);
    return seeded;
  }

  let logs = cached.logs as T[];
  let { scannedFrom, scannedTo } = cached;

  /* Forward: the new blocks since the last read. Cheap, and the reason polls stay fast. */
  if (scannedTo < toBlock) {
    logs = [...logs, ...(await fetchRange(scannedTo + BigInt(1), toBlock, fetchChunk))];
    scannedTo = toBlock;
  }

  /* Backward: reclaim a bounded slice of older history per call, until fully covered. */
  if (scannedFrom > fromBlock) {
    const target = scannedFrom - stride * BigInt(BACKFILL_CHUNKS);
    const start = target > fromBlock ? target : fromBlock;
    logs = [...(await fetchRange(start, scannedFrom - BigInt(1), fetchChunk)), ...logs];
    scannedFrom = start;
  }

  const entry = { scannedFrom, scannedTo, logs: sortLogs(logs) };
  logCache.set(cacheKey, entry);
  writePersistedLogs(cacheKey, entry);
  return entry.logs as T[];
}

function sessionEnabled(owner?: string): owner is Address {
  return Boolean(owner && SESSION_FACTORY_ADDRESS && MARKET_ADAPTER_ADDRESS);
}

async function readSessionAddress(owner?: string): Promise<Address | null> {
  const factory = SESSION_FACTORY_ADDRESS;
  if (!sessionEnabled(owner) || !factory) return null;

  const session = await getPublicClient().readContract({
    address: factory,
    abi: pulseSessionFactoryAbi,
    functionName: "sessionOf",
    args: [owner],
  });

  return session === "0x0000000000000000000000000000000000000000" ? null : session;
}

async function getSessionState(owner?: string): Promise<SessionState | null> {
  const session = await readSessionAddress(owner);
  if (!session) return null;

  const chain = getPulseChain();
  const collateral = getCollateral(chain.id);
  const client = getPublicClient();

  const [policy, armed, windowsUsed, decimals, balance] = await Promise.all([
    client.readContract({
      address: session,
      abi: pulseSessionAbi,
      functionName: "policy",
    }),
    client.readContract({
      address: session,
      abi: pulseSessionAbi,
      functionName: "armed",
    }),
    client.readContract({
      address: session,
      abi: pulseSessionAbi,
      functionName: "windowsUsed",
    }),
    client.readContract({
      address: collateral.address,
      abi: erc20Abi,
      functionName: "decimals",
    }),
    client.readContract({
      address: collateral.address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [session],
    }),
  ]);

  const remaining = formatAmount(Number(formatUnits(balance, decimals)));
  const windowsLeft = Math.max(0, Number(policy[1]) - Number(windowsUsed));

  return {
    address: session,
    budget: remaining,
    remaining,
    windowsLeft,
    rule: decodeRule(Number(policy[3])),
    armed,
    expiry: Number(policy[2]),
  };
}

/*
 * Realized P&L, today's win rate, and streak — computed from the session contract's own
 * Placed/Redeemed event log rather than left as a stub. This is safe to fetch in full
 * (no block-range chunking) because a session can only ever place `policy.maxWindows`
 * calls in its whole lifetime, so its log is always small. Scoped to session-held
 * positions only: wallet-direct trades never touch these contracts, so they have no
 * settlement history here to draw from (see readWalletPositions).
 */
async function getSessionRealizedStats(session: Address): Promise<{
  realized: number;
  todayWins: number;
  todayCalls: number;
  streak: number;
}> {
  const empty = { realized: 0, todayWins: 0, todayCalls: 0, streak: 0 };

  try {
    const client = getPublicClient();
    const collateral = getCollateral(getPulseChain().id);
    const [fromBlock, toBlock] = await Promise.all([
      getContractCreationBlock(session),
      client.getBlockNumber(),
    ]);
    const [decimals, placedLogs, redeemedLogs] = await Promise.all([
      client.readContract({ address: collateral.address, abi: erc20Abi, functionName: "decimals" }),
      getLogsChunked(
        fromBlock,
        toBlock,
        (from, to) =>
          client.getContractEvents({
            address: session,
            abi: pulseSessionAbi,
            eventName: "Placed",
            fromBlock: from,
            toBlock: to,
          }),
        `${session}:Placed`,
      ),
      getLogsChunked(
        fromBlock,
        toBlock,
        (from, to) =>
          client.getContractEvents({
            address: session,
            abi: pulseSessionAbi,
            eventName: "Redeemed",
            fromBlock: from,
            toBlock: to,
          }),
        `${session}:Redeemed`,
      ),
    ]);

    if (placedLogs.length === 0) return empty;

    const blocks = await Promise.all(
      [...new Set(placedLogs.map((log) => log.blockNumber))].map((blockNumber) =>
        client.getBlock({ blockNumber: blockNumber as bigint }),
      ),
    );
    const tsByBlock = new Map(blocks.map((block) => [block.number, Number(block.timestamp)]));

    const stakeByMarket = new Map<string, number>();
    const orderedMarkets: string[] = [];
    for (const log of placedLogs) {
      const marketId = log.args.marketId as string;
      const stake = Number(formatUnits(log.args.stake as bigint, decimals));
      stakeByMarket.set(marketId, (stakeByMarket.get(marketId) ?? 0) + stake);
      orderedMarkets.push(marketId);
    }

    const creditedByMarket = new Map<string, number>();
    for (const log of redeemedLogs) {
      const marketId = log.args.marketId as string;
      const credited = Number(formatUnits(log.args.credited as bigint, decimals));
      creditedByMarket.set(marketId, (creditedByMarket.get(marketId) ?? 0) + credited);
    }

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const todayCutoff = Math.floor(startOfToday.getTime() / 1000);

    let realized = 0;
    let todayWins = 0;
    let todayCalls = 0;
    for (const [marketId, credited] of creditedByMarket) {
      const stake = stakeByMarket.get(marketId) ?? 0;
      realized += credited - stake;
    }
    for (const log of placedLogs) {
      const ts = tsByBlock.get(log.blockNumber as bigint) ?? 0;
      if (ts < todayCutoff) continue;
      todayCalls += 1;
      const marketId = log.args.marketId as string;
      const credited = creditedByMarket.get(marketId);
      const stake = stakeByMarket.get(marketId) ?? 0;
      if (credited !== undefined && credited > stake) todayWins += 1;
    }

    // Most-recent-first streak of consecutive wins (or, once a loss is hit, we stop —
    // a redeemed-but-unprofitable market breaks the streak; a not-yet-resolved market
    // is skipped rather than breaking it, since it isn't a result yet).
    let streak = 0;
    for (let i = orderedMarkets.length - 1; i >= 0; i--) {
      const marketId = orderedMarkets[i];
      const credited = creditedByMarket.get(marketId);
      if (credited === undefined) continue;
      const stake = stakeByMarket.get(marketId) ?? 0;
      if (credited > stake) {
        streak += 1;
      } else {
        break;
      }
    }

    return { realized, todayWins, todayCalls, streak };
  } catch {
    // Log-range or RPC hiccup: degrade to the honest "no data yet" state rather than block.
    return empty;
  }
}

async function ensureWindows(): Promise<LiveWindow[]> {
  if (lastWindows.length === 0) {
    lastWindows = await loadLiveWindows(getExchange());
  }
  return lastWindows;
}

/*
 * Actual entry price per (marketId, side), from the same event log used for realized P&L
 * — `stake / contractsFilled` — rather than the market's current live quote. A session's
 * log is always small (bounded by policy.maxWindows), so fetching it in full is cheap.
 * Falls back to an empty map (callers fall back to the live quote) on any RPC hiccup.
 */
async function getSessionEntryPrices(
  session: Address,
  adapter: Address,
): Promise<Map<string, number>> {
  try {
    const client = getPublicClient();
    const [fromBlock, toBlock] = await Promise.all([
      getContractCreationBlock(session),
      client.getBlockNumber(),
    ]);
    const [placedLogs, filledLogs] = await Promise.all([
      getLogsChunked(
        fromBlock,
        toBlock,
        (from, to) =>
          client.getContractEvents({
            address: session,
            abi: pulseSessionAbi,
            eventName: "Placed",
            fromBlock: from,
            toBlock: to,
          }),
        `${session}:Placed`,
      ),
      getLogsChunked(
        fromBlock,
        toBlock,
        (from, to) =>
          client.getContractEvents({
            address: adapter,
            abi: pulseMarketAdapterAbi,
            eventName: "OutcomeRecorded",
            args: { holder: session },
            fromBlock: from,
            toBlock: to,
          }),
        `${adapter}:OutcomeRecorded`,
      ),
    ]);

    const stakeByKey = new Map<string, bigint>();
    for (const log of placedLogs) {
      const key = `${(log.args.marketId as string).toLowerCase()}-${log.args.side}`;
      stakeByKey.set(key, (stakeByKey.get(key) ?? BigInt(0)) + (log.args.stake as bigint));
    }

    const filledByKey = new Map<string, bigint>();
    for (const log of filledLogs) {
      const key = `${(log.args.marketId as string).toLowerCase()}-${log.args.outcomeIdx}`;
      filledByKey.set(key, (filledByKey.get(key) ?? BigInt(0)) + (log.args.amount as bigint));
    }

    const prices = new Map<string, number>();
    for (const [key, stake] of stakeByKey) {
      const filled = filledByKey.get(key);
      if (filled && filled > BigInt(0)) prices.set(key, Number(stake) / Number(filled));
    }
    return prices;
  } catch {
    return new Map();
  }
}

/*
 * Every marketId the session has ever placed on, from its own Placed log — not just
 * whatever is currently in the "live" window list. A resolved/voided market drops out of
 * listLiveBinaryMarkets once past expiry, so relying on that list alone would silently stop
 * detecting (and let a user silently stop being able to claim) a position the moment its
 * window ages out of the live board.
 */
async function getSessionTradedMarketIds(session: Address): Promise<`0x${string}`[]> {
  try {
    const client = getPublicClient();
    const [fromBlock, toBlock] = await Promise.all([
      getContractCreationBlock(session),
      client.getBlockNumber(),
    ]);
    const logs = await getLogsChunked(
      fromBlock,
      toBlock,
      (from, to) =>
        client.getContractEvents({
          address: session,
          abi: pulseSessionAbi,
          eventName: "Placed",
          fromBlock: from,
          toBlock: to,
        }),
      `${session}:Placed`,
    );
    return [...new Set(logs.map((log) => log.args.marketId as `0x${string}`))];
  } catch {
    return [];
  }
}

async function readSessionPositions(owner?: string): Promise<Position[]> {
  const session = await readSessionAddress(owner);
  if (!session || !MARKET_ADAPTER_ADDRESS) return [];
  const adapter = MARKET_ADAPTER_ADDRESS;

  const [windows, entryPrices, tradedMarketIds] = await Promise.all([
    ensureWindows(),
    getSessionEntryPrices(session, adapter),
    getSessionTradedMarketIds(session),
  ]);
  const windowById = new Map(windows.map((w) => [w.marketId.toLowerCase(), w]));
  const client = getPublicClient();
  const exchange = getExchange();

  const reads = tradedMarketIds.flatMap((marketId) =>
    ([0, 1] as const).map(async (sideIndex) => {
      const contracts = await client.readContract({
        address: adapter,
        abi: pulseMarketAdapterAbi,
        functionName: "held",
        args: [session, marketId, sideIndex],
      });

      return { marketId, side: (sideIndex === 0 ? "up" : "down") as CallSide, contracts };
    }),
  );

  const rows = (await Promise.all(reads)).filter((row) => row.contracts > BigInt(0));
  if (rows.length === 0) return [];

  return Promise.all(
    rows.map(async ({ marketId, side, contracts }) => {
      const window = windowById.get(marketId.toLowerCase());
      const card = window ?? (await getMarketCard(exchange, marketId));
      const quoteDecimals = window?.quoteDecimals ?? 6;

      // Status/payout come from the chain directly rather than the (possibly stale, or
      // entirely absent past expiry) indexer-derived window — see getSessionTradedMarketIds.
      const onchain = await exchange.client.getMarketOnchain(marketId);
      const status = statusFromOnchain(onchain.status, onchain.isResolved, onchain.isVoided);

      // The fee only ever skims a winning payout (estPayoutFor ignores it for a loser or a
      // void), so it's only worth the extra indexer round-trip once actually resolved.
      const feeBps =
        status === "resolved"
          ? BigInt((await exchange.client.getMarketFees(marketId))?.settlementFeeBps ?? "0")
          : BigInt(0);

      const expectedPayout = Number(
        formatUnits(
          estPayoutFor({
            marketId,
            pool: onchain.pool,
            outcomeIdx: side === "up" ? 0 : 1,
            amount: contracts,
            winningOutcome: onchain.isResolved ? onchain.winningOutcome : null,
            voided: onchain.isVoided,
            status: status === "resolved" ? "Resolved" : status === "voided" ? "Voided" : "Trading",
            settlementFeeBps: feeBps,
          }),
          quoteDecimals,
        ),
      );

      const entryKey = `${marketId.toLowerCase()}-${side === "up" ? 0 : 1}`;
      const liveQuote = side === "up" ? (card?.upPrice ?? 0.5) : (card?.downPrice ?? 0.5);

      return {
        marketId,
        side,
        contracts: formatAmount(Number(formatUnits(contracts, quoteDecimals))),
        avgPrice: entryPrices.get(entryKey) ?? liveQuote,
        status,
        redeemable: status === "resolved" || status === "voided",
        expectedPayout,
        heldBy: "session" as const,
      };
    }),
  );
}

/*
 * Realized P&L for direct wallet trades (bypassing any session). `getOpenPositionsWithPnL`
 * only ever sees OPEN (non-zero balance) positions, so a redeemed position — the exact
 * point realized P&L exists to describe — has already vanished from it by the time it
 * matters. The indexer's raw router-action log still has it: a "Redeem" action carries the
 * actual `payout`, which the SDK's own pnlEventsFor() deliberately drops (it only needs
 * cost-basis events for OPEN positions). Folding fills + mint/merge (cost basis) against
 * redeems (payout) the same way the SDK's computePositionPnL folds fills against sells
 * reconstructs the real number — mint/merge use the same even 50/50 split across both legs
 * that computePositionPnL uses, since a complete set is always worth exactly 1 collateral
 * unit regardless of the market's current price.
 */
async function getWalletRealizedPnl(owner: Address): Promise<number> {
  try {
    const exchange = getExchange();
    const collateral = getCollateral(getPulseChain().id);
    const [decimals, fills, actions] = await Promise.all([
      getPublicClient().readContract({
        address: collateral.address,
        abi: erc20Abi,
        functionName: "decimals",
      }),
      exchange.client.getUserFills(owner, { limit: 1000 }),
      exchange.client.getRouterActions(owner, { limit: 1000 }),
    ]);

    if (fills.length === 0 && actions.length === 0) return 0;

    const acct = owner.toLowerCase();
    type Event = {
      key: string;
      kind: "buy" | "sell" | "redeem";
      qty: bigint;
      quote: bigint;
      ts: number;
    };
    const events: Event[] = [];

    for (const f of fills) {
      const isMaker = (f.maker ?? "").toLowerCase() === acct;
      const isTaker =
        (f.taker ?? "").toLowerCase() === acct ||
        (f.takerOrder?.owner ?? "").toLowerCase() === acct;
      if (!isMaker && !isTaker) continue;

      const side = isMaker ? f.makerSide : (f.takerOrder?.side ?? f.takerSide);
      if (side == null) continue;

      const outcomeIndex = side === "BUY_NO" || side === "SELL_NO" ? 1 : 0;
      const isBuy = side === "BUY_YES" || side === "BUY_NO";
      events.push({
        key: `${f.market.toLowerCase()}-${outcomeIndex}`,
        kind: isBuy ? "buy" : "sell",
        qty: BigInt(f.quantity),
        quote: BigInt(f.quoteQuantity),
        ts: Number(f.timestamp),
      });
    }

    for (const action of actions) {
      if (action.account.toLowerCase() !== acct || !action.market) continue;
      if (action.kind !== "MintCompleteSet" && action.kind !== "MergeCompleteSet") continue;

      const amount = BigInt(action.amount);
      if (amount <= BigInt(0)) continue;
      // A complete set is always worth exactly 1 collateral unit, split evenly across the
      // two legs — independent of decimals, so no oneCollateral scaling needed here.
      const half = amount / BigInt(2);
      const kind = action.kind === "MintCompleteSet" ? "buy" : "sell";

      for (const idx of [0, 1]) {
        events.push({
          key: `${action.market.toLowerCase()}-${idx}`,
          kind,
          qty: amount,
          quote: half,
          ts: Number(action.timestamp),
        });
      }
    }

    // Redeem carries no outcomeIdx — infer it by matching the burned amount against
    // whichever tracked leg for this market currently holds exactly that many contracts
    // (RouterActionRecord.amount is "winning tokens burned", i.e. the full leg balance).
    const qtyByKey = new Map<string, bigint>();
    for (const e of [...events].sort((a, b) => a.ts - b.ts)) {
      const running = qtyByKey.get(e.key) ?? BigInt(0);
      qtyByKey.set(e.key, e.kind === "buy" ? running + e.qty : running - e.qty);
    }

    for (const action of actions) {
      if (action.kind !== "Redeem") continue;
      if (action.account.toLowerCase() !== acct || !action.market || !action.payout) continue;
      const amount = BigInt(action.amount);
      if (amount <= BigInt(0)) continue;

      const marketPrefix = `${action.market.toLowerCase()}-`;
      const candidates = [0, 1]
        .map((idx) => `${marketPrefix}${idx}`)
        .filter((key) => qtyByKey.get(key) === amount);
      const key = candidates[0] ?? `${marketPrefix}0`;

      events.push({
        key,
        kind: "redeem",
        qty: amount,
        quote: BigInt(action.payout),
        ts: Number(action.timestamp),
      });
      qtyByKey.set(key, (qtyByKey.get(key) ?? BigInt(0)) - amount);
    }

    const books = new Map<string, { qty: bigint; cost: bigint }>();
    let realizedRaw = BigInt(0);

    for (const e of events.sort((a, b) => a.ts - b.ts)) {
      const book = books.get(e.key) ?? { qty: BigInt(0), cost: BigInt(0) };
      if (e.kind === "buy") {
        book.qty += e.qty;
        book.cost += e.quote;
      } else {
        const avg = book.qty > BigInt(0) ? book.cost / book.qty : BigInt(0);
        const settled = e.qty < book.qty ? e.qty : book.qty;
        const costOut = avg * settled;
        realizedRaw += e.quote - costOut;
        book.qty -= settled;
        book.cost -= costOut;
      }
      books.set(e.key, book);
    }

    return Number(formatUnits(realizedRaw, decimals));
  } catch {
    return 0;
  }
}

async function readWalletPositions(owner?: string): Promise<Position[]> {
  if (!owner) return [];
  const positions = await getExchange().client.getOpenPositionsWithPnL(owner);

  return positions.flatMap((position) => {
    const decimals = position.market.quoteDecimals;
    const status = liveStatus(position.market.status);
    const legs = [
      { side: "up" as const, data: position.outcomes.yes },
      { side: "down" as const, data: position.outcomes.no },
    ];

    return legs
      .filter((leg) => leg.data.balance > BigInt(0))
      .map((leg) => ({
        marketId: position.market.id as `0x${string}`,
        side: leg.side,
        contracts: rawAmount(leg.data.balance, decimals),
        avgPrice: Number(formatUnits(leg.data.avgCost, decimals)),
        status,
        redeemable: status === "resolved" || status === "voided",
        // markValue is already payout-shaped post-resolution: balance × (1 won / 0 lost),
        // or half on void — see markFor() in the SDK's computePositionPnL.
        expectedPayout:
          leg.data.markValue != null
            ? Number(formatUnits(leg.data.markValue, decimals))
            : undefined,
        heldBy: "wallet" as const,
      }));
  });
}

async function readPositions(owner?: string): Promise<Position[]> {
  const [wallet, session] = await Promise.all([
    readWalletPositions(owner),
    readSessionPositions(owner),
  ]);
  return [...session, ...wallet];
}

async function getSessionTape(owner?: string): Promise<Tape> {
  const session = await readSessionAddress(owner);
  const [positions, stats, walletRealized] = await Promise.all([
    readPositions(owner),
    session ? getSessionRealizedStats(session) : Promise.resolve(null),
    owner ? getWalletRealizedPnl(owner as Address) : Promise.resolve(0),
  ]);
  const unclaimed = positions
    .filter((position) => position.redeemable)
    // expectedPayout is the actual redeemable value (winner minus fee, half on void, zero on
    // loss) — never fall back to raw contract count, which overstates a losing/voided leg.
    .reduce((sum, position) => sum + (position.expectedPayout ?? 0), 0);
  const realized = (stats?.realized ?? 0) + walletRealized;

  return {
    ...EMPTY_TAPE,
    realized: formatAmount(realized),
    ...(stats ? { todayWins: stats.todayWins, streak: stats.streak } : {}),
    unclaimed: formatAmount(unclaimed),
    todayCalls: stats ? stats.todayCalls : positions.length,
    autoClaims: positions.filter((position) => position.heldBy === "session" && position.redeemable)
      .length,
  };
}

async function readActivity(owner?: string): Promise<TapeEntry[]> {
  if (!owner) return [];
  const session = await readSessionAddress(owner);
  const accounts = [owner, session].filter(Boolean) as Address[];
  const [orderGroups, redemptions] = await Promise.all([
    Promise.all(
      accounts.map(async (account) => ({
        account,
        orders: await getExchange().client.getOrders(account, { limit: 20 }),
      })),
    ),
    session ? readSessionRedemptions(session) : Promise.resolve([]),
  ]);

  const orderRows = orderGroups
    .flatMap((group) => group.orders.map((order) => ({ account: group.account, order })))
    .filter(({ order }) => order.market.startsWith("0x"))
    .map(({ account, order }) => ({
      id: `${account}-${order.id}`,
      kind: kindFromOrderStatus(order.status),
      marketId: order.market as `0x${string}`,
      symbol: symbolFromMarket(order.marketInfo?.asset, order.marketInfo?.interval),
      side: sideFromOrder(order.side),
      amount: rawAmount(order.fullQuantity, order.marketInfo?.quoteDecimals ?? 6),
      txHash: order.placedTxHash as `0x${string}`,
      ts: Number(order.placedAtTimestamp),
      noSignature: false,
    }));

  return [...orderRows, ...redemptions].sort((a, b) => b.ts - a.ts).slice(0, 25);
}

async function readSessionRedemptions(session: Address): Promise<TapeEntry[]> {
  try {
    const client = getPublicClient();
    const collateral = getCollateral(getPulseChain().id);
    const [fromBlock, toBlock] = await Promise.all([
      getContractCreationBlock(session),
      client.getBlockNumber(),
    ]);
    const [decimals, windows, placedLogs, redeemedLogs] = await Promise.all([
      client.readContract({ address: collateral.address, abi: erc20Abi, functionName: "decimals" }),
      ensureWindows().catch(() => [] as LiveWindow[]),
      getLogsChunked(
        fromBlock,
        toBlock,
        (from, to) =>
          client.getContractEvents({
            address: session,
            abi: pulseSessionAbi,
            eventName: "Placed",
            fromBlock: from,
            toBlock: to,
          }),
        `${session}:Placed`,
      ),
      getLogsChunked(
        fromBlock,
        toBlock,
        (from, to) =>
          client.getContractEvents({
            address: session,
            abi: pulseSessionAbi,
            eventName: "Redeemed",
            fromBlock: from,
            toBlock: to,
          }),
        `${session}:Redeemed`,
      ),
    ]);
    if (redeemedLogs.length === 0) return [];

    const sideByMarket = new Map<string, CallSide>();
    for (const log of placedLogs) {
      sideByMarket.set(
        (log.args.marketId as string).toLowerCase(),
        sideFromOutcome(log.args.side as number),
      );
    }

    const symbolByMarket = new Map(
      windows.map((window) => [window.marketId.toLowerCase(), `${window.pair}-${window.window}`]),
    );
    const blocks = await Promise.all(
      [...new Set(redeemedLogs.map((log) => log.blockNumber))].map((blockNumber) =>
        client.getBlock({ blockNumber: blockNumber as bigint }),
      ),
    );
    const tsByBlock = new Map(blocks.map((block) => [block.number, Number(block.timestamp)]));

    return redeemedLogs.map((log) => {
      const marketId = log.args.marketId as `0x${string}`;
      const key = marketId.toLowerCase();
      return {
        id: `${session}-${log.transactionHash}-${log.logIndex}`,
        kind: "auto-claimed" as const,
        marketId,
        symbol: symbolByMarket.get(key) ?? formatMarketId(marketId),
        side: sideByMarket.get(key),
        amount: rawAmount(log.args.credited as bigint, decimals),
        txHash: log.transactionHash,
        ts: tsByBlock.get(log.blockNumber as bigint) ?? 0,
        noSignature: true,
      };
    });
  } catch {
    return [];
  }
}

async function readRedeemable(owner?: string): Promise<Redeemable[]> {
  if (!owner) return [];
  const claimable = await getExchange().client.getClaimable(owner);

  return claimable.map((position) => ({
    marketId: position.marketId as `0x${string}`,
    symbol: position.pool,
    side: sideFromOutcome(position.outcomeIdx),
    expectedPayout: rawAmount(position.estPayout, 6),
    voided: position.status === "Voided",
  }));
}

// === Source

export const liveDataSource: PulseDataSource = {
  isMock: false,

  async listMarkets(): Promise<MarketCard[]> {
    lastWindows = await loadLiveWindows(getExchange());
    return lastWindows.map(toCard);
  },

  async getMarket(marketId: string): Promise<MarketCard | null> {
    if (lastWindows.length === 0) {
      lastWindows = await loadLiveWindows(getExchange());
    }
    return (
      lastWindows.map(toCard).find((m) => m.marketId.toLowerCase() === marketId.toLowerCase()) ??
      null
    );
  },

  async getOrderBook(marketId: string): Promise<OrderBook> {
    let window = lastWindows.find((w) => w.marketId.toLowerCase() === marketId.toLowerCase());
    if (!window) {
      lastWindows = await loadLiveWindows(getExchange());
      window = lastWindows.find((w) => w.marketId.toLowerCase() === marketId.toLowerCase());
    }

    if (!window) {
      return { symbol: marketId, asks: [], bids: [], upPrice: null, downPrice: null };
    }

    const book = await fetchBinaryBook(window, getExchange());
    return { symbol: marketId, ...book };
  },

  listPositions: readPositions,
  getTape: getSessionTape,
  getActivity: readActivity,
  listRedeemable: readRedeemable,
  getSession: getSessionState,
};
