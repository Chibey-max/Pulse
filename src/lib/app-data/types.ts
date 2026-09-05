import type { Hex } from "viem";
import type { CallSide, MarketCard, Position, SessionState, Tape } from "@/lib/types";

// === Order book

export interface BookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  symbol: string;
  /* Up-terms. asks are offers to sell Up, bids are offers to buy Up. */
  asks: BookLevel[];
  bids: BookLevel[];
  upPrice: number | null;
  downPrice: number | null;
}

// === Activity tape

export type TapeKind =
  | "placed"
  | "filled"
  | "cancelled"
  | "locked"
  | "resolved"
  | "auto-claimed"
  | "auto-rolled"
  | "withdrawn";

export interface TapeEntry {
  id: string;
  kind: TapeKind;
  marketId: Hex;
  symbol: string;
  side?: CallSide;
  amount?: string;
  txHash: Hex;
  ts: number;
  /* Auto rows carry this only when a handler-originated transaction hash is present. */
  noSignature?: boolean;
}

// === Claim

export interface Redeemable {
  marketId: Hex;
  symbol: string;
  side: CallSide;
  expectedPayout: string;
  voided: boolean;
}

// === The data source contract

export interface PulseDataSource {
  readonly isMock: boolean;
  listMarkets(): Promise<MarketCard[]>;
  getMarket(marketId: string): Promise<MarketCard | null>;
  getOrderBook(marketId: string): Promise<OrderBook>;
  listPositions(owner?: string): Promise<Position[]>;
  getTape(owner?: string): Promise<Tape>;
  getActivity(owner?: string): Promise<TapeEntry[]>;
  listRedeemable(owner?: string): Promise<Redeemable[]>;
  getSession(owner?: string): Promise<SessionState | null>;
}
