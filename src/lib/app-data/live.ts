import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import {
  type LiveWindow,
  createPulseExchange,
  fetchBinaryBook,
  loadLiveWindows,
} from "@/lib/markets";
import type { MarketCard, SessionState, Tape } from "@/lib/types";
import type { OrderBook, PulseDataSource, Redeemable, TapeEntry } from "./types";

/*
  Live read-only data source. Wired for markets, one market, and the order book, which are
  all indexer + eth_call reads and need no deployed contracts. Positions, session, tape,
  activity, and redeemables return empty until PulseSessionFactory is deployed and the
  reactive settlement path exists; every screen already renders the empty state.
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

function getExchange(): SomniaMarkets {
  exchange ??= createPulseExchange();
  return exchange;
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

  listPositions: async () => [],
  getTape: async (): Promise<Tape> => EMPTY_TAPE,
  getActivity: async (): Promise<TapeEntry[]> => [],
  listRedeemable: async (): Promise<Redeemable[]> => [],
  getSession: async (): Promise<SessionState | null> => null,
};
