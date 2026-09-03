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

// The write side of the app-data layer. These wrappers always talk to the live SDK.

// === Writes

export async function placeCall(
  walletClient: WalletClient,
  market: MarketCard,
  side: CallSide,
  stake: number,
): Promise<UnifiedOrder> {
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
  const exchange = createPulseExchange(walletClient);
  return cancelOrder(exchange, orderId, outcomeSymbol);
}
