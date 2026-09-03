import type { UnifiedOrder } from "@somnia-chain/markets-sdk";
import type { Address, WalletClient } from "viem";
import { cancelOrder, createPulseExchange, placeMarketableCall } from "@/lib/markets";
import {
  claimAllRedeemable,
  listRedeemableMarkets,
  type ClaimAllResult,
  type RedeemableMarket,
} from "@/lib/redeem";
import type { CallSide, MarketCard } from "@/lib/types";

/*
  The write side of the app-data layer. Reads go through the mock/live data source; these
  wrappers always talk to the live SDK, so callers must gate on IS_MOCK before invoking
  them. `createPulseExchange` throws when the indexer / WS endpoints are unset, so guard
  that first with a message the notification layer can show as-is.
*/

// === Guard

function assertLiveEndpoints(): void {
  if (!process.env.NEXT_PUBLIC_INDEXER_URL || !process.env.NEXT_PUBLIC_WS_RPC_URL) {
    throw new Error("Live trading is not configured. Nothing was submitted.");
  }
}

// === Writes

export async function placeCall(
  walletClient: WalletClient,
  market: MarketCard,
  side: CallSide,
  stake: number,
): Promise<UnifiedOrder> {
  assertLiveEndpoints();
  const exchange = createPulseExchange(walletClient);
  return placeMarketableCall(exchange, market, side, stake);
}

/*
  `redeemables` is optional: the direct-mode claim panel has the UI list, but the SDK's
  own `getClaimable` is the source of truth for the on-chain amounts, so when nothing is
  passed we fetch it here.
*/
export async function claimAll(
  walletClient: WalletClient,
  redeemables?: RedeemableMarket[],
): Promise<ClaimAllResult> {
  assertLiveEndpoints();
  const owner = walletClient.account?.address as Address | undefined;
  if (!owner) {
    throw new Error("Connect a wallet to claim. Nothing was submitted.");
  }

  const exchange = createPulseExchange(walletClient);
  const markets = redeemables ?? (await listRedeemableMarkets(exchange, owner));
  return claimAllRedeemable(exchange, markets);
}

export async function cancelResidual(
  walletClient: WalletClient,
  orderId: string,
  outcomeSymbol: string,
): Promise<unknown> {
  assertLiveEndpoints();
  const exchange = createPulseExchange(walletClient);
  return cancelOrder(exchange, orderId, outcomeSymbol);
}
