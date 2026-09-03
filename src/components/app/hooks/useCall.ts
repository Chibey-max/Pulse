"use client";

import { useCallback, useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useConfig, useWalletClient, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useQueryClient } from "@tanstack/react-query";
import type { UnifiedOrder } from "@somnia-chain/markets-sdk";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/lib/app-data";
import { useCollateralDecimals } from "@/lib/app-data/collateral";
import { placeCall } from "@/lib/app-data/writes";
import { pulseSessionAbi } from "@/lib/session";
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

      setStatus("placing");
      const toastId = show({
        title: "Placing your call…",
        description: `${side.toUpperCase()} · ${formatAmount(stake)} tUSDC · IOC`,
        variant: "pending",
      });

      try {
        if (session) {
          const txHash = await writeContractAsync({
            address: session.address,
            abi: pulseSessionAbi,
            functionName: "place",
            args: [market.marketId, side === "up" ? 0 : 1, parseUnits(String(stake), decimals)],
          });
          await waitForTransactionReceipt(config, { hash: txHash });

          update(toastId, {
            title: "Session call submitted",
            description: "Your policy enforced the call from the funded session.",
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
