import type { Hex } from "viem";
import type { MarketCard, Position, SessionState, Tape } from "@/lib/types";
import type { OrderBook, PulseDataSource, Redeemable, TapeEntry } from "./types";

// === Helpers

const now = (): number => Math.floor(Date.now() / 1000);

function hex(seed: string): Hex {
  const body = seed.padEnd(40, "0").slice(0, 40);
  return `0x${body.replace(/[^0-9a-f]/gi, "0")}` as Hex;
}

// === Markets

/*
  Four windows: BTC/ETH x 15m/1h, at staggered points in their lifecycle so the UI shows
  Trading, Locked, and Resolved without waiting.
*/
function buildMarkets(): MarketCard[] {
  const base = now();
  return [
    {
      marketId: hex("eth15m"),
      symbol: "ETH-15m",
      pair: "ETH",
      window: "15m",
      strike: "3,842.16",
      expiryTs: base + 8 * 60 + 42,
      status: "trading",
      upPrice: 0.57,
      downPrice: 0.43,
    },
    {
      marketId: hex("btc15m"),
      symbol: "BTC-15m",
      pair: "BTC",
      window: "15m",
      strike: "68,120.40",
      expiryTs: base + 3 * 60 + 5,
      status: "trading",
      upPrice: 0.49,
      downPrice: 0.51,
    },
    {
      marketId: hex("eth1h"),
      symbol: "ETH-1h",
      pair: "ETH",
      window: "1h",
      strike: "3,838.00",
      expiryTs: base + 41,
      status: "locked",
      upPrice: 0.62,
      downPrice: 0.38,
    },
    {
      marketId: hex("btc1h"),
      symbol: "BTC-1h",
      pair: "BTC",
      window: "1h",
      strike: "67,905.10",
      expiryTs: base - 240,
      status: "resolved",
      upPrice: 1,
      downPrice: 0,
    },
  ];
}

function buildBook(marketId: string): OrderBook {
  return {
    symbol: marketId,
    asks: [
      { price: 0.58, size: 320 },
      { price: 0.59, size: 540 },
      { price: 0.61, size: 900 },
    ],
    bids: [
      { price: 0.56, size: 410 },
      { price: 0.55, size: 780 },
      { price: 0.53, size: 1200 },
    ],
    upPrice: 0.57,
    downPrice: 0.43,
  };
}

function buildPositions(): Position[] {
  return [
    {
      marketId: hex("eth15m"),
      side: "up",
      contracts: "43.86",
      avgPrice: 0.57,
      status: "trading",
      redeemable: false,
      heldBy: "session",
    },
    {
      marketId: hex("btc1h"),
      side: "up",
      contracts: "50.00",
      avgPrice: 0.5,
      status: "resolved",
      redeemable: true,
      heldBy: "wallet",
    },
  ];
}

function buildTape(): Tape {
  return {
    realized: "84.15",
    unclaimed: "25.00",
    todayCalls: 6,
    todayWins: 4,
    streak: 2,
    autoClaims: 3,
  };
}

function buildActivity(): TapeEntry[] {
  const base = now();
  return [
    {
      id: "a1",
      kind: "placed",
      marketId: hex("eth15m"),
      symbol: "ETH-15m",
      side: "up",
      amount: "25.00",
      txHash: hex("txplaced"),
      ts: base - 60,
    },
    {
      id: "a2",
      kind: "filled",
      marketId: hex("eth15m"),
      symbol: "ETH-15m",
      side: "up",
      amount: "25.00",
      txHash: hex("txfilled"),
      ts: base - 58,
    },
    {
      id: "a3",
      kind: "resolved",
      marketId: hex("btc1h"),
      symbol: "BTC-1h",
      txHash: hex("txresolved"),
      ts: base - 240,
    },
    {
      id: "a4",
      kind: "auto-claimed",
      marketId: hex("btc1h"),
      symbol: "BTC-1h",
      amount: "50.00",
      txHash: hex("txredeem"),
      ts: base - 236,
      noSignature: true,
    },
    {
      id: "a5",
      kind: "auto-rolled",
      marketId: hex("btc1h"),
      symbol: "BTC-1h",
      side: "up",
      amount: "25.00",
      txHash: hex("txroll"),
      ts: base - 234,
      noSignature: true,
    },
  ];
}

function buildRedeemable(): Redeemable[] {
  return [
    {
      marketId: hex("btc1h"),
      symbol: "BTC-1h",
      side: "up",
      expectedPayout: "50.00",
      voided: false,
    },
  ];
}

function buildSession(): SessionState {
  return {
    address: hex("session1"),
    budget: "200",
    remaining: "142.60",
    windowsLeft: 2,
    rule: "stop-on-loss",
    armed: true,
    expiry: now() + 92 * 60,
  };
}

// === Source

/*
  Latency is faked so loading and skeleton states are actually reachable in development.
*/
const delay = <T>(value: T, ms = 220): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const mockDataSource: PulseDataSource = {
  isMock: true,
  listMarkets: () => delay(buildMarkets()),
  getMarket: (marketId) =>
    delay(buildMarkets().find((m) => m.marketId.toLowerCase() === marketId.toLowerCase()) ?? null),
  getOrderBook: (marketId) => delay(buildBook(marketId)),
  listPositions: () => delay(buildPositions()),
  getTape: () => delay(buildTape()),
  getActivity: () => delay(buildActivity()),
  listRedeemable: () => delay(buildRedeemable()),
  getSession: () => delay(buildSession()),
};
