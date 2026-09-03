import type { MarketCard } from "@/lib/types";

/*
  Sample design content for the marketing page, labelled as sample everywhere it renders.
  The app route reads real markets from the SDK; this is only so the landing page can
  show the product's shape before a wallet is connected and before src/lib/markets.ts is
  wired for server use. Numbers match the design brief.
*/
/*
  Fixed values, never `Date.now()`-derived: this object is bundled for both server and
  client, and a moving `expiryTs` would hydrate-mismatch. The marketing WindowCard renders
  the countdown as a static "08:42" from this sample anyway.
*/
export const SAMPLE_WINDOW: MarketCard & { sample: true } = {
  sample: true,
  marketId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  symbol: "ETH-15m",
  pair: "ETH",
  window: "15m",
  strike: "3,842.16",
  expiryTs: 1_788_000_000,
  status: "trading",
  upPrice: 0.57,
  downPrice: 0.43,
};

export const SAMPLE_SESSION = {
  budget: "200",
  maxPerWindow: "25",
  windows: 4,
  rule: "Stops after one miss",
  pair: "ETH · 15m",
} as const;
