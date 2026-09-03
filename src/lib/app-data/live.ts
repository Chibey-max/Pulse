import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { createPublicClient, erc20Abi, formatUnits, http, type Address } from "viem";
import { getCollateral, getPulseChain, SOMNIA_SHANNON_RPC_URL } from "@/lib/chain";
import {
  type LiveWindow,
  createPulseExchange,
  fetchBinaryBook,
  loadLiveWindows,
} from "@/lib/markets";
import {
  decodeRule,
  pulseMarketAdapterAbi,
  pulseSessionAbi,
  pulseSessionFactoryAbi,
} from "@/lib/session";
import type { CallSide, MarketCard, Position, SessionState, Tape, WindowStatus } from "@/lib/types";
import { formatAmount } from "@/lib/format";
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

async function ensureWindows(): Promise<LiveWindow[]> {
  if (lastWindows.length === 0) {
    lastWindows = await loadLiveWindows(getExchange());
  }
  return lastWindows;
}

async function readSessionPositions(owner?: string): Promise<Position[]> {
  const session = await readSessionAddress(owner);
  if (!session || !MARKET_ADAPTER_ADDRESS) return [];
  const adapter = MARKET_ADAPTER_ADDRESS;

  const windows = await ensureWindows();
  const client = getPublicClient();
  const reads = windows.flatMap((window) =>
    ([0, 1] as const).map(async (sideIndex) => {
      const contracts = await client.readContract({
        address: adapter,
        abi: pulseMarketAdapterAbi,
        functionName: "held",
        args: [session, window.marketId, sideIndex],
      });

      return { window, side: (sideIndex === 0 ? "up" : "down") as CallSide, contracts };
    }),
  );

  const rows = await Promise.all(reads);
  return rows
    .filter((row) => row.contracts > BigInt(0))
    .map(({ window, side, contracts }) => ({
      marketId: window.marketId,
      side,
      contracts: formatAmount(Number(formatUnits(contracts, window.quoteDecimals))),
      avgPrice: side === "up" ? (window.upPrice ?? 0.5) : (window.downPrice ?? 0.5),
      status: window.status,
      redeemable: window.status === "resolved" || window.status === "voided",
      heldBy: "session",
    }));
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
  const positions = await readPositions(owner);
  const unclaimed = positions
    .filter((position) => position.redeemable)
    .reduce((sum, position) => sum + Number(position.contracts), 0);

  return {
    ...EMPTY_TAPE,
    unclaimed: formatAmount(unclaimed),
    todayCalls: positions.length,
    autoClaims: positions.filter((position) => position.heldBy === "session" && position.redeemable)
      .length,
  };
}

async function readActivity(owner?: string): Promise<TapeEntry[]> {
  if (!owner) return [];
  const session = await readSessionAddress(owner);
  const accounts = [owner, session].filter(Boolean) as Address[];
  const orderGroups = await Promise.all(
    accounts.map(async (account) => ({
      account,
      orders: await getExchange().client.getOrders(account, { limit: 20 }),
    })),
  );

  return orderGroups
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
      noSignature: session ? account.toLowerCase() === session.toLowerCase() : false,
    }))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 25);
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
