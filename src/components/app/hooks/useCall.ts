"use client";

import { useCallback, useState } from "react";
import { formatUnits, parseUnits, type Hex } from "viem";
import { useAccount, useConfig, useWalletClient, useWriteContract } from "wagmi";
import { readContract, simulateContract, waitForTransactionReceipt } from "wagmi/actions";
import { useQueryClient } from "@tanstack/react-query";
import type { UnifiedOrder } from "@somnia-chain/markets-sdk";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/lib/app-data";
import { useCollateralDecimals } from "@/lib/app-data/collateral";
import { BINARY_MODULE_ADDRESS, MARKET_ADAPTER_ADDRESS } from "@/lib/app-data/config";
import { placeCall } from "@/lib/app-data/writes";
import { createPulseExchange } from "@/lib/markets";
import {
  MARKET_FINALIZED_TOPIC,
  pulseSessionAbi,
  subscribeSessionToSettlement,
} from "@/lib/session";
import { getTxUrl } from "@/lib/chain";
import { decodeTxError } from "@/lib/tx";
import { formatAmount } from "@/lib/format";
import type { CallSide, MarketCard } from "@/lib/types";

// === Types

export type CallStatus = "idle" | "placing" | "success" | "error";

export interface UseCall {
  call: (side: CallSide, stake: number) => Promise<void>;
  status: CallStatus;
}

interface CallOutcome {
  title: string;
  description: string;
  variant: "success" | "info";
}

const sessionAdapterAbi = [
  {
    type: "function",
    name: "maxYesPrice",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "maxNoPrice",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "module",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const binaryModuleAbi = [
  {
    type: "function",
    name: "markets",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [
      {
        name: "record",
        type: "tuple",
        components: [
          { name: "oracleQuestionId", type: "uint256" },
          { name: "outcomeSlotCount", type: "uint8" },
          { name: "voidPolicy", type: "uint8" },
          { name: "collateral", type: "address" },
          { name: "originOperatorId", type: "uint32" },
          { name: "originVenueId", type: "bytes32" },
          { name: "oracleAdapter", type: "address" },
          { name: "creator", type: "address" },
          { name: "market", type: "address" },
          { name: "pool", type: "address" },
          { name: "yesId", type: "uint256" },
          { name: "noId", type: "uint256" },
          { name: "tradingStart", type: "uint64" },
          { name: "expiry", type: "uint64" },
        ],
      },
    ],
  },
] as const;

const binaryPoolAbi = [
  {
    type: "function",
    name: "getOrderBookParameters",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "tickSize", type: "uint256" },
          { name: "minQuantity", type: "uint256" },
          { name: "lotSize", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "error",
    name: "InvalidQuantity",
    inputs: [
      { name: "quantity", type: "uint256" },
      { name: "lotSize", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "QuantityBelowMinimum",
    inputs: [
      { name: "quantity", type: "uint256" },
      { name: "minQuantity", type: "uint256" },
    ],
  },
] as const;

// === Helpers

/* Read the fill result off the returned order rather than assuming a full fill. */
function summarizeFill(order: UnifiedOrder): CallOutcome {
  const filled = order.filled ?? 0;
  const remaining = order.remaining ?? Math.max(0, order.amount - filled);

  if (filled <= 0) {
    return {
      title: "Missed — the book moved",
      description: "Nothing filled. No funds left your wallet.",
      variant: "info",
    };
  }
  if (remaining > 0) {
    return {
      title: `Partial fill — ${formatAmount(filled)} contracts`,
      description: `${formatAmount(filled)} of ${formatAmount(order.amount)} contracts. The rest expired (IOC).`,
      variant: "success",
    };
  }
  return {
    title: `Filled — ${formatAmount(filled)} contracts`,
    description: "Your call is live for this window.",
    variant: "success",
  };
}

async function lotAlignSessionStake(
  config: ReturnType<typeof useConfig>,
  marketId: Hex,
  side: CallSide,
  stakeRaw: bigint,
  decimals: number,
) {
  const [maxYesPrice, maxNoPrice, moduleAddress] = await Promise.all([
    readContract(config, {
      address: MARKET_ADAPTER_ADDRESS,
      abi: sessionAdapterAbi,
      functionName: "maxYesPrice",
    }),
    readContract(config, {
      address: MARKET_ADAPTER_ADDRESS,
      abi: sessionAdapterAbi,
      functionName: "maxNoPrice",
    }),
    readContract(config, {
      address: MARKET_ADAPTER_ADDRESS,
      abi: sessionAdapterAbi,
      functionName: "module",
    }),
  ]);

  const record = await readContract(config, {
    address: moduleAddress,
    abi: binaryModuleAbi,
    functionName: "markets",
    args: [marketId],
  });
  const params = await readContract(config, {
    address: record.pool,
    abi: binaryPoolAbi,
    functionName: "getOrderBookParameters",
  });

  const oneCollateral = BigInt(10) ** BigInt(decimals);
  const sidePrice = side === "up" ? maxYesPrice : maxNoPrice;
  const rawQuantity = (stakeRaw * oneCollateral) / sidePrice;
  const quantity = (rawQuantity / params.lotSize) * params.lotSize;
  if (quantity <= BigInt(0) || quantity < params.minQuantity) {
    throw new Error(
      "This stake is below the current pool minimum. Increase the stake or use Direct mode.",
    );
  }

  const alignedStake = (quantity * sidePrice + oneCollateral - BigInt(1)) / oneCollateral;
  return alignedStake > stakeRaw ? stakeRaw : alignedStake;
}

// === Hook

export function useCall(market: MarketCard | undefined): UseCall {
  const config = useConfig();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: session } = useSession();
  const decimals = useCollateralDecimals();
  const { writeContractAsync } = useWriteContract();
  const { show, update } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CallStatus>("idle");

  const call = useCallback(
    async (side: CallSide, stake: number): Promise<void> => {
      if (!walletClient) {
        show({
          title: "Connect a wallet",
          description: "Connect on Somnia Shannon testnet to place a call.",
          variant: "error",
        });
        return;
      }
      if (!market) return;

      if (session) {
        const balance = Number(session.remaining.replace(/,/g, ""));
        if (balance < stake) {
          show({
            title: "Fund session first",
            description: `Session balance is ${formatAmount(balance)} tUSDC. Add funds before placing a ${formatAmount(stake)} tUSDC call.`,
            variant: "error",
          });
          return;
        }
      }

      setStatus("placing");
      const toastId = show({
        title: "Placing your call…",
        description: `${side.toUpperCase()} · ${formatAmount(stake)} tUSDC · IOC`,
        variant: "pending",
      });

      let autoRedeemArmed = true;

      try {
        if (session) {
          const isAllowed = await readContract(config, {
            address: session.address,
            abi: pulseSessionAbi,
            functionName: "allowedMarket",
            args: [market.marketId],
          });

          if (!isAllowed) {
            update(toastId, {
              title: "Extending session…",
              description: "This window rolled since the session was funded — allowing it once.",
              variant: "pending",
            });
            await simulateContract(config, {
              address: session.address,
              abi: pulseSessionAbi,
              functionName: "addAllowedMarket",
              args: [[market.marketId]],
              account: walletClient.account,
            });
            const extendHash = await writeContractAsync({
              address: session.address,
              abi: pulseSessionAbi,
              functionName: "addAllowedMarket",
              args: [[market.marketId]],
            });
            await waitForTransactionReceipt(config, { hash: extendHash });

            /*
              createSession subscribes every market it was funded with; a window that rolled
              in afterwards has no subscription yet, so without this the handler would never
              fire for it and the winnings would need a manual claim — the exact thing the
              session is for. Non-fatal on failure: the call itself is the user's intent and
              the position stays valid, so we note the degraded state on the success toast
              rather than aborting a call they already committed to.
            */
            update(toastId, {
              title: "Arming auto-redeem…",
              description: "Subscribing this window's settlement to your session handler.",
              variant: "pending",
            });
            try {
              const subscriptionHash = await subscribeSessionToSettlement(
                createPulseExchange(walletClient),
                walletClient,
                session.address,
                BINARY_MODULE_ADDRESS,
                MARKET_FINALIZED_TOPIC,
                market.marketId,
              );
              await waitForTransactionReceipt(config, { hash: subscriptionHash });
            } catch {
              autoRedeemArmed = false;
            }

            update(toastId, {
              title: "Placing your call…",
              description: `${side.toUpperCase()} · ${formatAmount(stake)} tUSDC · IOC`,
              variant: "pending",
            });
          }

          const requestedStake = parseUnits(String(stake), decimals);
          const sessionStake = await lotAlignSessionStake(
            config,
            market.marketId,
            side,
            requestedStake,
            decimals,
          );
          if (sessionStake < requestedStake) {
            update(toastId, {
              title: "Placing your call…",
              description: `${side.toUpperCase()} · ${formatAmount(Number(formatUnits(sessionStake, decimals)))} tUSDC · lot-aligned`,
              variant: "pending",
            });
          }
          await simulateContract(config, {
            address: session.address,
            abi: pulseSessionAbi,
            functionName: "place",
            args: [market.marketId, side === "up" ? 0 : 1, sessionStake],
            account: walletClient.account,
          });
          const txHash = await writeContractAsync({
            address: session.address,
            abi: pulseSessionAbi,
            functionName: "place",
            args: [market.marketId, side === "up" ? 0 : 1, sessionStake],
          });
          await waitForTransactionReceipt(config, { hash: txHash });

          update(toastId, {
            title: "Session call submitted",
            description: autoRedeemArmed
              ? "Your policy enforced the call from the funded session."
              : "Call placed, but this window's auto-redeem could not be armed — claim it from Positions when it resolves.",
            variant: "success",
            action: { label: "View transaction", href: getTxUrl(txHash) },
            duration: 6_000,
          });
          setStatus("success");

          queryClient.invalidateQueries({ queryKey: ["session", address] });
          queryClient.invalidateQueries({ queryKey: ["positions", address] });
          queryClient.invalidateQueries({ queryKey: ["tape", address] });
          queryClient.invalidateQueries({ queryKey: ["book", market.marketId] });
          return;
        }

        const order = await placeCall(walletClient, market, side, stake);
        const outcome = summarizeFill(order);
        const txHash = order.txHash;

        update(toastId, {
          title: outcome.title,
          description: outcome.description,
          variant: outcome.variant,
          action: txHash
            ? { label: "View transaction", href: getTxUrl(txHash as `0x${string}`) }
            : undefined,
          duration: 6_000,
        });
        setStatus("success");

        queryClient.invalidateQueries({ queryKey: ["positions", address] });
        queryClient.invalidateQueries({ queryKey: ["book", market.marketId] });
      } catch (error) {
        update(toastId, {
          title: "Call not placed",
          description: decodeTxError(error),
          variant: "error",
          duration: 8_000,
        });
        setStatus("error");
      }
    },
    [
      walletClient,
      market,
      session,
      writeContractAsync,
      decimals,
      config,
      address,
      show,
      update,
      queryClient,
    ],
  );

  return { call, status };
}
