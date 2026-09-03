"use client";

import { useCallback, useState } from "react";
import { useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import type { UnifiedOrder } from "@somnia-chain/markets-sdk";
import { useToast } from "@/components/ui/toast";
import { IS_MOCK } from "@/lib/app-data";
import { placeCall } from "@/lib/app-data/writes";
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

const MOCK_MESSAGE = "Live trading needs NEXT_PUBLIC_MOCK=0 and configured endpoints.";

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
  const { data: walletClient } = useWalletClient();
  const { show, update } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CallStatus>("idle");

  const call = useCallback(
    async (side: CallSide, stake: number): Promise<void> => {
      if (IS_MOCK) {
        show({ title: "Sample mode", description: MOCK_MESSAGE, variant: "info" });
        return;
      }
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

        queryClient.invalidateQueries({ queryKey: ["positions"] });
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
    [walletClient, market, show, update, queryClient],
  );

  return { call, status };
}
